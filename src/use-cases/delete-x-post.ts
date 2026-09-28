import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XPostId } from '../domain/x-post-id.ts';
import type { XPostDeps, XPublishError } from './x-posting.ts';

export type XDeleteSummary = {
  readonly platform: 'x';
  readonly id: string;
  readonly deleted: true;
};

export type DeleteXPost = (input: { readonly id: XPostId }) => Promise<Result<XDeleteSummary, XPublishError>>;

// Only the post itself goes: the other parts of a --split thread are posts of their own. On
// an edited post, X deletes every version with it.
export const createDeleteXPost =
  (deps: XPostDeps): DeleteXPost =>
  async (input) => {
    const deleted = await deps.x.deletePost(input.id);
    if (!deleted.ok) {
      deps.logger.warn('x.delete.failed', { cause: deleted.error.kind });
      return err({ step: 'delete', platform: 'x', cause: deleted.error.kind, message: deleted.error.message });
    }
    return ok({ platform: 'x', id: input.id, deleted: true });
  };
