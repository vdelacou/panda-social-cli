import { describe, expect, it } from 'bun:test';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { err, ok } from '../domain/result.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
import { createImageFilesFake } from '../test-helpers/image-files-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createXFake, X_FAKE_MEDIA_ID } from '../test-helpers/x-fake.ts';
import type { XFake, XFakeConfig } from '../test-helpers/x-fake.ts';
import { createUpdateXPost } from './update-x-post.ts';
import type { UpdateXPost } from './update-x-post.ts';

const OLD = xPostIdUnsafe('1880000000000000009');
const P1 = '1880000000000000001';
const link = (id: string): string => `https://x.com/i/status/${id}`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

type Updating = { readonly x: XFake; readonly update: UpdateXPost };

const updateWith = (config?: XFakeConfig, files: Readonly<Record<string, Uint8Array>> = {}): Updating => {
  const x = createXFake(config);
  return { x, update: createUpdateXPost({ x, files: createImageFilesFake(files), logger: createLoggerFake() }) };
};

describe('updating a post on X', () => {
  it('without --repost, an update edits the post in place: X gets the new text, the uploaded image and the old id, and the agent gets the new version with "edited"', async () => {
    const { x, update } = updateWith(undefined, { './fixed.png': PNG });

    const result = await update({ id: OLD, text: 'Launch day, typo fixed', imagePath: imagePathUnsafe('./fixed.png'), repost: false });

    expect(result).toEqual(ok({ platform: 'x', id: P1, url: link(P1), edited: OLD }));
    expect(x.events).toEqual(['upload', `edit:${OLD}`]);
    expect(x.posts).toEqual([{ text: 'Launch day, typo fixed', mediaIds: [X_FAKE_MEDIA_ID], editOf: OLD, id: P1 }]);
  });

  it("when X refuses the edit, the agent gets edit-refused naming the post and X's reason; any other failure keeps its own cause", async () => {
    const refused = updateWith({ errors: { createPost: { atPost: 1, error: { kind: 'forbidden', message: 'You are not permitted to edit this post.' } } } });
    const limited = updateWith({ errors: { createPost: { atPost: 1, error: { kind: 'rate-limited', message: 'Too many requests.' } } } });

    const first = await refused.update({ id: OLD, text: 'Fixed', repost: false });
    const second = await limited.update({ id: OLD, text: 'Fixed', repost: false });

    expect(first).toEqual(err({ step: 'edit', platform: 'x', cause: 'edit-refused', message: `X refused to edit post ${OLD}: You are not permitted to edit this post.` }));
    expect(second).toEqual(err({ step: 'edit', platform: 'x', cause: 'rate-limited', message: 'Too many requests.' }));
  });

  it('an edit replaces one post, so a text over 280 counted characters is refused even with --split, pointing to --repost', async () => {
    const { x, update } = updateWith();

    const result = await update({ id: OLD, text: 'a'.repeat(281), split: true, repost: false });

    expect(result).toEqual(
      err({
        step: 'validate',
        platform: 'x',
        cause: 'text-too-long',
        message:
          'An edit replaces one post, and the text counts 281 characters the way X counts them; the limit is 280. Shorten it, or pass --repost to publish it as a new post or thread.',
      })
    );
    expect(x.events).toEqual([]);
  });

  it('an edit whose image cannot be read is refused as invalid-image before X is asked anything', async () => {
    const { x, update } = updateWith();

    const result = await update({ id: OLD, text: 'Fixed', imagePath: imagePathUnsafe('./missing.png'), repost: false });

    expect(result).toEqual(err({ step: 'validate', platform: 'x', cause: 'invalid-image', message: 'No file at "./missing.png".' }));
    expect(x.events).toEqual([]);
  });

  it('with --repost, the old post is deleted first, then the new one published: the agent gets the new id with "replaced"', async () => {
    const { x, update } = updateWith();

    const result = await update({ id: OLD, text: 'Launch day, take two', repost: true });

    expect(result).toEqual(ok({ platform: 'x', id: P1, url: link(P1), replaced: OLD }));
    expect(x.events).toEqual([`delete:${OLD}`, 'post']);
  });

  it('with --repost, a failed delete publishes nothing, and a failed publish after the delete says the old post is gone', async () => {
    const undeletable = updateWith({ errors: { deletePost: { ids: [OLD], error: { kind: 'forbidden', message: 'Not your post.' } } } });
    const unpublishable = updateWith({ errors: { createPost: { atPost: 1, error: { kind: 'duplicate-text', message: 'Duplicate content.' } } } });

    const kept = await undeletable.update({ id: OLD, text: 'Take two', repost: true });
    const lost = await unpublishable.update({ id: OLD, text: 'Take two', repost: true });

    expect(kept).toEqual(err({ step: 'delete-old', platform: 'x', cause: 'forbidden', message: 'Not your post.' }));
    expect(undeletable.x.events).toEqual([`delete:${OLD}`]);
    expect(lost).toEqual(
      err({
        step: 'publish',
        platform: 'x',
        cause: 'duplicate-text',
        message: `The old post ${OLD} was deleted, but the new one was not published: Duplicate content.`,
        details: { oldPostDeleted: OLD },
      })
    );
  });
});
