import { describe, expect, it } from 'bun:test';
import { facebookPostIdUnsafe } from '../domain/facebook-post-id.ts';
import { err, ok } from '../domain/result.ts';
import { createFacebookFake } from '../test-helpers/facebook-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createDeleteFacebookPost } from './delete-facebook-post.ts';

const POST = facebookPostIdUnsafe('104000000000001_122000000000009');

describe('deleting a post from a Facebook Page', () => {
  it('deleting a Page post answers its id with deleted: true', async () => {
    const facebook = createFacebookFake();

    const result = await createDeleteFacebookPost({ facebook, logger: createLoggerFake() })({ id: POST });

    expect(result).toEqual(ok({ platform: 'facebook', id: POST, deleted: true }));
    expect(facebook.deleted).toEqual([POST]);
  });

  it("when Meta refuses the delete, the agent gets Meta's cause naming the delete step, and the log names the cause", async () => {
    const logger = createLoggerFake();
    const facebook = createFacebookFake({ errors: { deletePost: { kind: 'forbidden', message: '(#200) Permissions error' } } });

    const result = await createDeleteFacebookPost({ facebook, logger })({ id: POST });

    expect(result).toEqual(err({ step: 'delete', platform: 'facebook', cause: 'forbidden', message: '(#200) Permissions error' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'facebook.delete.failed', meta: { cause: 'forbidden' } }]);
  });
});
