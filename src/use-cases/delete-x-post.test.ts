import { describe, expect, it } from 'bun:test';
import { err, ok } from '../domain/result.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createXFake } from '../test-helpers/x-fake.ts';
import { createDeleteXPost } from './delete-x-post.ts';

const POST = '1880000000000000001';

describe('deleting a post on X', () => {
  it('deleting an X post answers its id with deleted: true', async () => {
    const x = createXFake();

    const result = await createDeleteXPost({ x, logger: createLoggerFake() })({ id: xPostIdUnsafe(POST) });

    expect(result).toEqual(ok({ platform: 'x', id: POST, deleted: true }));
    expect(x.deleted).toEqual([POST]);
  });

  it("when X refuses the delete, the agent gets X's cause naming the delete step", async () => {
    const x = createXFake({ errors: { deletePost: { ids: [POST], error: { kind: 'forbidden', message: 'Not your post.' } } } });
    const logger = createLoggerFake();

    const result = await createDeleteXPost({ x, logger })({ id: xPostIdUnsafe(POST) });

    expect(result).toEqual(err({ step: 'delete', platform: 'x', cause: 'forbidden', message: 'Not your post.' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'x.delete.failed', meta: { cause: 'forbidden' } }]);
  });
});
