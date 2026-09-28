import { describe, expect, it } from 'bun:test';
import { err, ok } from '../domain/result.ts';
import { threadsPostIdUnsafe } from '../domain/threads-post-id.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createDeletePost } from './delete-post.ts';

const POST = '17890000000000001';

describe('deleting a Threads post', () => {
  it('deleting a post by its id removes it, and the agent gets the deleted id back', async () => {
    const threads = createThreadsFake();
    const deletePost = createDeletePost({ threads, logger: createLoggerFake() });

    const result = await deletePost({ id: threadsPostIdUnsafe(POST) });

    expect(result).toEqual(ok({ platform: 'threads', id: POST, deleted: true }));
    expect(threads.deleted).toEqual([POST]);
  });

  it('when Threads refuses the delete, the agent gets the error naming the delete step', async () => {
    const threads = createThreadsFake({ errors: { deletePost: { ids: [POST], error: { kind: 'forbidden', message: 'no threads_delete' } } } });
    const logger = createLoggerFake();
    const deletePost = createDeletePost({ threads, logger });

    const result = await deletePost({ id: threadsPostIdUnsafe(POST) });

    expect(result).toEqual(err({ step: 'delete', platform: 'threads', cause: 'forbidden', message: 'no threads_delete' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'threads.delete.failed', meta: { cause: 'forbidden' } }]);
  });
});
