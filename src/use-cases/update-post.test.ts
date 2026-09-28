import { describe, expect, it } from 'bun:test';
import { err, ok } from '../domain/result.ts';
import { threadsPostIdUnsafe } from '../domain/threads-post-id.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createUpdatePost } from './update-post.ts';

const OLD = '17890000000000001';
const NEW = '17890000000000002';
const LINK = 'https://www.threads.com/@panda/post/N3w';

describe('updating a Threads post', () => {
  it('Threads cannot edit a post, so an update without --repost is refused as unsupported and nothing changes', async () => {
    const threads = createThreadsFake();
    const updatePost = createUpdatePost({ threads, logger: createLoggerFake() });

    const result = await updatePost({ id: threadsPostIdUnsafe(OLD), text: 'Fixed typo', repost: false });

    expect(result).toEqual(err({ step: 'update', platform: 'threads', cause: 'unsupported', message: 'Threads cannot edit a published post.' }));
    expect(threads.events).toEqual([]);
  });

  it('with --repost, the old post is deleted first, then the new text is published, and the agent gets both ids', async () => {
    const threads = createThreadsFake({ nextPost: { id: NEW, url: LINK } });
    const updatePost = createUpdatePost({ threads, logger: createLoggerFake() });

    const result = await updatePost({ id: threadsPostIdUnsafe(OLD), text: 'Fixed typo', repost: true });

    expect(result).toEqual(ok({ platform: 'threads', id: NEW, url: LINK, replaced: OLD }));
    expect(threads.events).toEqual([`delete:${OLD}`, 'text']);
    expect(threads.published).toEqual(['Fixed typo']);
  });

  it('when the old post cannot be deleted, nothing is published', async () => {
    const threads = createThreadsFake({ errors: { deletePost: { ids: [OLD], error: { kind: 'forbidden', message: 'no threads_delete' } } } });
    const updatePost = createUpdatePost({ threads, logger: createLoggerFake() });

    const result = await updatePost({ id: threadsPostIdUnsafe(OLD), text: 'Fixed typo', repost: true });

    expect(result).toEqual(err({ step: 'delete-old', platform: 'threads', cause: 'forbidden', message: 'no threads_delete' }));
    expect(threads.published).toEqual([]);
  });

  it('when the new post fails after the old one was deleted, the error says the old post is gone', async () => {
    const threads = createThreadsFake({ errors: { publishText: { kind: 'rate-limited', message: 'slow down' } } });
    const updatePost = createUpdatePost({ threads, logger: createLoggerFake() });

    const result = await updatePost({ id: threadsPostIdUnsafe(OLD), text: 'Fixed typo', repost: true });

    expect(result).toEqual(
      err({
        step: 'publish',
        platform: 'threads',
        cause: 'rate-limited',
        message: `The old post ${OLD} was deleted, but the new one was not published: slow down`,
        details: { oldPostDeleted: OLD },
      })
    );
  });
});
