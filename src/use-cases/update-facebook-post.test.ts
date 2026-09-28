import { describe, expect, it } from 'bun:test';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import { facebookPostIdUnsafe } from '../domain/facebook-post-id.ts';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import { createFacebookFake } from '../test-helpers/facebook-fake.ts';
import type { FacebookFake, FacebookFakeConfig } from '../test-helpers/facebook-fake.ts';
import { createImageFilesFake } from '../test-helpers/image-files-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createUpdateFacebookPost } from './update-facebook-post.ts';
import type { UpdateFacebookPost } from './update-facebook-post.ts';

const PAGE = facebookPageIdUnsafe('104000000000001');
const OLD = facebookPostIdUnsafe('104000000000001_122000000000009');
const P1 = '104000000000001_122000000000001';
const link = (id: string): string => `https://www.facebook.com/104000000000001/posts/${id.slice('104000000000001_'.length)}`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

type Updating = { readonly facebook: FacebookFake; readonly update: UpdateFacebookPost };

const updateWith = (config?: FacebookFakeConfig, files: Readonly<Record<string, Uint8Array>> = {}): Updating => {
  const facebook = createFacebookFake(config);
  return { facebook, update: createUpdateFacebookPost({ facebook, files: createImageFilesFake(files), logger: createLoggerFake() }) };
};

describe('updating a post on a Facebook Page', () => {
  it('without --repost, an update edits the text in place: the agent gets the same id and link with "edited"', async () => {
    const { facebook, update } = updateWith();

    const result = await update({ pageId: PAGE, id: OLD, text: 'Hello from panda, typo fixed', repost: false });

    expect(result).toEqual(ok({ platform: 'facebook', id: OLD, url: link(OLD), edited: OLD }));
    expect(facebook.edits).toEqual([{ id: OLD, text: 'Hello from panda, typo fixed' }]);
    expect(facebook.events).toEqual([`edit:${OLD}`]);
  });

  it('an edit cannot change the image: --image without --repost is refused as unsupported before Meta is asked anything', async () => {
    const { facebook, update } = updateWith();

    const result = await update({ pageId: PAGE, id: OLD, text: 'A new photo', imageUrl: imageUrlUnsafe('https://cdn.example.com/cat.jpg'), repost: false });

    expect(result).toEqual(err({ step: 'update', platform: 'facebook', cause: 'unsupported', message: 'Facebook edits the text of a post, not its image.' }));
    expect(facebook.events).toEqual([]);
  });

  it('when Meta refuses the edit, as for a post this app did not make, the agent gets edit-refused naming the post; any other failure keeps its own cause', async () => {
    const refused = updateWith({ errors: { editText: { kind: 'forbidden', message: '(#200) Permissions error' } } });
    const limited = updateWith({ errors: { editText: { kind: 'rate-limited', message: '(#32) Page request limit reached' } } });

    const refusal = await refused.update({ pageId: PAGE, id: OLD, text: 'Fixed', repost: false });
    const limit = await limited.update({ pageId: PAGE, id: OLD, text: 'Fixed', repost: false });

    expect(refusal).toEqual(err({ step: 'edit', platform: 'facebook', cause: 'edit-refused', message: `Facebook refused to edit post ${OLD}: (#200) Permissions error` }));
    expect(limit).toEqual(err({ step: 'edit', platform: 'facebook', cause: 'rate-limited', message: '(#32) Page request limit reached' }));
  });

  it('with --repost, the old post is deleted first, then the new one published with its image: the agent gets the new id with "replaced"', async () => {
    const { facebook, update } = updateWith(undefined, { './chart.png': PNG });

    const result = await update({ pageId: PAGE, id: OLD, text: 'The chart, corrected', imagePath: imagePathUnsafe('./chart.png'), repost: true });

    expect(result).toEqual(ok({ platform: 'facebook', id: P1, url: link(P1), replaced: OLD }));
    expect(facebook.events).toEqual([`delete:${OLD}`, 'publish']);
    expect(facebook.posts).toEqual([{ id: P1, pageId: '104000000000001', text: 'The chart, corrected', photo: 'upload:png' }]);
  });

  it('with --repost, a failed delete publishes nothing, and a failed publish after the delete says the old post is gone', async () => {
    const undeletable = updateWith({ errors: { deletePost: { kind: 'forbidden', message: '(#200) Permissions error' } } });
    const unpublishable = updateWith({ errors: { publish: { kind: 'rate-limited', message: '(#32) Page request limit reached' } } });

    const kept = await undeletable.update({ pageId: PAGE, id: OLD, text: 'New', repost: true });
    const lost = await unpublishable.update({ pageId: PAGE, id: OLD, text: 'New', repost: true });

    expect(kept).toEqual(err({ step: 'delete-old', platform: 'facebook', cause: 'forbidden', message: '(#200) Permissions error' }));
    expect(undeletable.facebook.events).toEqual([`delete:${OLD}`]);
    expect(lost).toEqual(
      err({
        step: 'publish',
        platform: 'facebook',
        cause: 'rate-limited',
        message: `The old post ${OLD} was deleted, but the new one was not published: (#32) Page request limit reached`,
        details: { oldPostDeleted: OLD },
      })
    );
  });
});
