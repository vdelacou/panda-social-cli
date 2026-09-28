import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { PublishError, PublishPostDeps } from './publish-post.ts';

export type DeletePostInput = { readonly id: ThreadsPostId };

export type DeleteSummary = {
  readonly platform: 'threads';
  readonly id: string;
  readonly deleted: true;
};

export type DeletePost = (input: DeletePostInput) => Promise<Result<DeleteSummary, PublishError>>;

// Only the post itself goes: its replies, the other parts of a --split thread included,
// are posts of their own.
export const createDeletePost =
  (deps: PublishPostDeps): DeletePost =>
  async (input) => {
    const deleted = await deps.threads.deletePost(input.id);
    if (!deleted.ok) {
      deps.logger.warn('threads.delete.failed', { cause: deleted.error.kind });
      return err({ step: 'delete', platform: 'threads', cause: deleted.error.kind, message: deleted.error.message });
    }
    return ok({ platform: 'threads', id: input.id, deleted: true });
  };
