import type { FacebookPostId } from '../domain/facebook-post-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { FacebookPostDeps, FacebookPublishError } from './facebook-posting.ts';

export type FacebookDeleteSummary = {
  readonly platform: 'facebook';
  readonly id: string;
  readonly deleted: true;
};

export type DeleteFacebookPost = (input: { readonly id: FacebookPostId }) => Promise<Result<FacebookDeleteSummary, FacebookPublishError>>;

// Meta's posts guide deletes any Page post with DELETE; one other page calls it restricted,
// which the live check settles.
export const createDeleteFacebookPost =
  (deps: FacebookPostDeps): DeleteFacebookPost =>
  async (input) => {
    const deleted = await deps.facebook.deletePost(input.id);
    if (!deleted.ok) {
      deps.logger.warn('facebook.delete.failed', { cause: deleted.error.kind });
      return err({ step: 'delete', platform: 'facebook', cause: deleted.error.kind, message: deleted.error.message });
    }
    return ok({ platform: 'facebook', id: input.id, deleted: true });
  };
