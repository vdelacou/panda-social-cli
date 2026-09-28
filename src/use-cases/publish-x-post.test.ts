import { describe, expect, it } from 'bun:test';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { err, ok } from '../domain/result.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
import { createImageFilesFake } from '../test-helpers/image-files-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import type { LoggerFake } from '../test-helpers/logger-fake.ts';
import { createXFake, X_FAKE_MEDIA_ID } from '../test-helpers/x-fake.ts';
import type { XFake, XFakeConfig } from '../test-helpers/x-fake.ts';
import { createPublishXPost } from './publish-x-post.ts';
import type { PublishXPost } from './publish-x-post.ts';

const P1 = '1880000000000000001';
const P2 = '1880000000000000002';
const P3 = '1880000000000000003';
const link = (id: string): string => `https://x.com/i/status/${id}`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const NOTES = new Uint8Array(Array.from('Just some notes', (char) => char.codePointAt(0) ?? 0));

// Paragraphs of about 150 counted characters: two never fit in one 280-character post.
const paragraph = (number: number): string => `Part ${number} ${'word '.repeat(28).trim()}`;
const paragraphs = (count: number): ReadonlyArray<string> => Array.from({ length: count }, (_, index) => paragraph(index + 1));

type Publishing = { readonly x: XFake; readonly logger: LoggerFake; readonly publish: PublishXPost };

const publishWith = (config?: XFakeConfig, files: Readonly<Record<string, Uint8Array>> = {}): Publishing => {
  const x = createXFake(config);
  const logger = createLoggerFake();
  return { x, logger, publish: createPublishXPost({ x, files: createImageFilesFake(files), logger }) };
};

describe('publishing a post to X', () => {
  it('when an agent posts "Hello from panda" to X, it gets back the new post id and its x.com link', async () => {
    const { x, publish } = publishWith();

    const result = await publish({ text: 'Hello from panda' });

    expect(result).toEqual(ok({ platform: 'x', id: P1, url: link(P1) }));
    expect(x.posts).toEqual([{ text: 'Hello from panda', id: P1 }]);
  });

  it('a text of exactly 280 counted characters goes out as one post; 281 without --split is refused before X is asked anything', async () => {
    const fits = publishWith();
    const over = publishWith();

    const whole = await fits.publish({ text: 'a'.repeat(280) });
    const refused = await over.publish({ text: 'a'.repeat(281) });

    expect(whole).toEqual(ok({ platform: 'x', id: P1, url: link(P1) }));
    expect(fits.x.posts).toEqual([{ text: 'a'.repeat(280), id: P1 }]);
    expect(refused).toEqual(err({ step: 'validate', platform: 'x', cause: 'text-too-long', message: 'The text counts 281 characters the way X counts them; the limit is 280.' }));
    expect(over.x.events).toEqual([]);
  });

  it('an image file with a caption: the image is uploaded first, then the post carries its media id; an image alone goes out with an empty text', async () => {
    const { x, publish } = publishWith(undefined, { './cat.png': PNG });

    const captioned = await publish({ text: 'A cat on the sofa', imagePath: imagePathUnsafe('./cat.png') });
    await publish({ imagePath: imagePathUnsafe('./cat.png') });

    expect(captioned).toEqual(ok({ platform: 'x', id: P1, url: link(P1) }));
    expect(x.events).toEqual(['upload', 'post', 'upload', 'post']);
    expect(x.uploads).toEqual(['png', 'png']);
    expect(x.posts).toEqual([
      { text: 'A cat on the sofa', mediaIds: [X_FAKE_MEDIA_ID], id: P1 },
      { text: '', mediaIds: [X_FAKE_MEDIA_ID], id: P2 },
    ]);
  });

  it('an image that cannot be read, or is not a JPEG, PNG, GIF or WEBP, is refused as invalid-image before anything is uploaded or posted', async () => {
    const { x, publish } = publishWith(undefined, { './notes.png': NOTES });

    const missing = await publish({ text: 'A cat', imagePath: imagePathUnsafe('./missing.png') });
    const notAnImage = await publish({ text: 'A cat', imagePath: imagePathUnsafe('./notes.png') });

    expect(missing).toEqual(err({ step: 'validate', platform: 'x', cause: 'invalid-image', message: 'No file at "./missing.png".' }));
    expect(notAnImage).toEqual(err({ step: 'validate', platform: 'x', cause: 'invalid-image', message: '"./notes.png" is not a JPEG, PNG, GIF or WEBP image.' }));
    expect(x.events).toEqual([]);
  });

  it('when X refuses the image, nothing is posted: a rejected image comes back as image-rejected, any other refusal as itself', async () => {
    const rejected = publishWith({ errors: { uploadImage: { kind: 'rejected', status: 400, message: 'Unsupported image.' } } }, { './cat.png': PNG });
    const unauthorized = publishWith({ errors: { uploadImage: { kind: 'unauthorized', message: 'Invalid keys.' } } }, { './cat.png': PNG });

    const first = await rejected.publish({ imagePath: imagePathUnsafe('./cat.png') });
    const second = await unauthorized.publish({ imagePath: imagePathUnsafe('./cat.png') });

    expect(first).toEqual(err({ step: 'upload', platform: 'x', cause: 'image-rejected', message: 'Unsupported image.' }));
    expect(second).toEqual(err({ step: 'upload', platform: 'x', cause: 'unauthorized', message: 'Invalid keys.' }));
    expect(rejected.x.events).toEqual(['upload']);
  });

  it('with --split, a long text goes out as a post and replies, each answering the one before, and the image goes on the first post only', async () => {
    const [first, second, third] = paragraphs(3);
    const { x, publish } = publishWith(undefined, { './chart.png': PNG });

    const result = await publish({ text: paragraphs(3).join('\n\n'), imagePath: imagePathUnsafe('./chart.png'), split: true });

    expect(result).toEqual(ok({ platform: 'x', id: P1, url: link(P1), replies: [P2, P3] }));
    expect(x.posts).toEqual([
      { text: first, mediaIds: [X_FAKE_MEDIA_ID], id: P1 },
      { text: second, replyTo: xPostIdUnsafe(P1), id: P2 },
      { text: third, replyTo: xPostIdUnsafe(P2), id: P3 },
    ]);
  });

  it('when a reply fails mid-thread, the parts already out are deleted newest first, and the agent learns what was deleted and what was left behind', async () => {
    const { x, logger, publish } = publishWith({
      errors: { createPost: { atPost: 3, error: { kind: 'rate-limited', message: 'slow down' } }, deletePost: { ids: [P1], error: { kind: 'forbidden', message: 'not yours' } } },
    });

    const result = await publish({ text: paragraphs(4).join('\n\n'), split: true });

    expect(result).toEqual(
      err({
        step: 'publish',
        platform: 'x',
        cause: 'rate-limited',
        message: 'Part 3 of 4 failed: slow down. The thread was rolled back: 1 published part(s) deleted, 1 left behind.',
        details: { deleted: [P2], leftBehind: [P1] },
      })
    );
    expect(x.events).toEqual(['post', `reply:${P1}`, `reply:${P2}`, `delete:${P2}`, `delete:${P1}`]);
    expect(logger.calls).toContainEqual({ level: 'warn', event: 'x.thread.rolled-back', meta: { deleted: 1, leftBehind: 1 } });
  });

  it("when X refuses the post, the agent gets X's cause naming the publish step, and the log names the cause without the text", async () => {
    const { logger, publish } = publishWith({ errors: { createPost: { atPost: 1, error: { kind: 'credits-depleted', message: 'No credits left.' } } } });

    const result = await publish({ text: 'Hello from panda' });

    expect(result).toEqual(err({ step: 'publish', platform: 'x', cause: 'credits-depleted', message: 'No credits left.' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'x.publish.failed', meta: { cause: 'credits-depleted' } }]);
  });
});
