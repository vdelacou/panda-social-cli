import { describe, expect, it } from 'bun:test';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createPublishPost } from './publish-post.ts';

describe('publishing a post to Threads', () => {
  it('when an agent posts "Hello from panda" to Threads, it gets back the new post id and its link', async () => {
    const threads = createThreadsFake({ nextPost: { id: '17890000000000001', url: 'https://www.threads.com/@panda/post/C0ffee' } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: 'Hello from panda' });

    expect(result).toEqual(ok({ platform: 'threads', id: '17890000000000001', url: 'https://www.threads.com/@panda/post/C0ffee' }));
    expect(threads.published).toEqual(['Hello from panda']);
  });

  it('when Threads rejects the token, the agent gets an unauthorized error that names the publish step', async () => {
    const threads = createThreadsFake({ errors: { publishText: { kind: 'unauthorized', message: 'token expired' } } });
    const logger = createLoggerFake();
    const publishPost = createPublishPost({ threads, logger });

    const result = await publishPost({ text: 'Hello from panda' });

    expect(result).toEqual(err({ step: 'publish', platform: 'threads', cause: 'unauthorized', message: 'token expired' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'threads.publish.failed', meta: { cause: 'unauthorized' } }]);
  });
});

const ROOT = '17890000000000001';
const LINK = 'https://www.threads.com/@panda/post/C0ffee';
const IMAGE = 'https://cdn.example.com/cat.jpg';
const R1 = '17891000000000001';
const R2 = '17891000000000002';

// Paragraphs of about 300 characters: two never fit in one 500-character post.
const paragraph = (number: number): string => `Part ${number} ${'word '.repeat(58).trim()}`;
const paragraphs = (count: number): ReadonlyArray<string> => Array.from({ length: count }, (_, index) => paragraph(index + 1));

describe('posting images and long texts to Threads', () => {
  it('when an agent posts an image URL with a caption, Threads gets both and the agent gets the new post link', async () => {
    const threads = createThreadsFake({ nextPost: { id: ROOT, url: LINK } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ imageUrl: imageUrlUnsafe(IMAGE), text: 'A cat on the sofa' });

    expect(result).toEqual(ok({ platform: 'threads', id: ROOT, url: LINK }));
    expect(threads.images).toEqual([{ url: IMAGE, text: 'A cat on the sofa' }]);
    expect(threads.published).toEqual([]);
  });

  it('an image posted with no text goes out alone', async () => {
    const threads = createThreadsFake({ nextPost: { id: ROOT, url: LINK } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ imageUrl: imageUrlUnsafe(IMAGE) });

    expect(result).toEqual(ok({ platform: 'threads', id: ROOT, url: LINK }));
    expect(threads.images).toEqual([{ url: IMAGE, text: undefined }]);
  });

  it('a text of exactly 500 counted characters goes out as one post', async () => {
    const threads = createThreadsFake({ nextPost: { id: ROOT, url: LINK } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: 'a'.repeat(500) });

    expect(result).toEqual(ok({ platform: 'threads', id: ROOT, url: LINK }));
    expect(threads.published).toEqual(['a'.repeat(500)]);
  });

  it('a text over 500 counted characters without --split is refused before anything is published', async () => {
    const threads = createThreadsFake();
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: 'a'.repeat(501) });

    expect(result).toEqual(
      err({ step: 'validate', platform: 'threads', cause: 'text-too-long', message: 'The text counts 501 characters the way Threads counts them; the limit is 500.' })
    );
    expect(threads.events).toEqual([]);
  });

  it('with --split, a long text goes out as a first post and replies, each reply answering the one before', async () => {
    const [first, second, third] = paragraphs(3);
    const threads = createThreadsFake({ nextPost: { id: ROOT, url: LINK } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: paragraphs(3).join('\n\n'), split: true });

    expect(result).toEqual(ok({ platform: 'threads', id: ROOT, url: LINK, replies: [R1, R2] }));
    expect(threads.published).toEqual([first]);
    expect(threads.replies).toEqual([
      { replyTo: ROOT, text: second, id: R1 },
      { replyTo: R1, text: third, id: R2 },
    ]);
  });

  it('when a reply fails mid-thread, every part already published is deleted, newest first, and the agent learns the thread was rolled back', async () => {
    const threads = createThreadsFake({ nextPost: { id: ROOT, url: LINK }, errors: { publishReply: { atReply: 2, error: { kind: 'rate-limited', message: 'slow down' } } } });
    const logger = createLoggerFake();
    const publishPost = createPublishPost({ threads, logger });

    const result = await publishPost({ text: paragraphs(4).join('\n\n'), split: true });

    expect(result).toEqual(
      err({
        step: 'publish',
        platform: 'threads',
        cause: 'rate-limited',
        message: 'Part 3 of 4 failed: slow down. The thread was rolled back: 2 published part(s) deleted, 0 left behind.',
        details: { deleted: [R1, ROOT], leftBehind: [] },
      })
    );
    expect(threads.deleted).toEqual([R1, ROOT]);
    expect(logger.calls).toContainEqual({ level: 'warn', event: 'threads.thread.rolled-back', meta: { deleted: 2, leftBehind: 0 } });
  });

  it('when a part of the rolled-back thread cannot be deleted, the agent gets the ids left behind', async () => {
    const threads = createThreadsFake({
      nextPost: { id: ROOT, url: LINK },
      errors: {
        publishReply: { atReply: 2, error: { kind: 'rate-limited', message: 'slow down' } },
        deletePost: { ids: [ROOT], error: { kind: 'forbidden', message: 'no threads_delete' } },
      },
    });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: paragraphs(4).join('\n\n'), split: true });

    expect(!result.ok && result.error.details).toEqual({ deleted: [R1], leftBehind: [ROOT] });
    expect(!result.ok && result.error.message).toBe('Part 3 of 4 failed: slow down. The thread was rolled back: 1 published part(s) deleted, 1 left behind.');
  });
});
