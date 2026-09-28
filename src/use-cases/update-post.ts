import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import { createPublishPost } from './publish-post.ts';
import type { PublishError, PublishPostDeps, PublishPostInput, PublishSummary } from './publish-post.ts';

export type UpdatePostInput = PublishPostInput & {
  readonly id: ThreadsPostId;
  // Threads has no edit: delete the post and publish the new one in its place.
  readonly repost: boolean;
};

export type UpdateSummary = PublishSummary & { readonly replaced: string };

export type UpdatePost = (input: UpdatePostInput) => Promise<Result<UpdateSummary, PublishError>>;

// Delete first: the likeliest failure, a token without threads_delete, then changes
// nothing, where publishing first would leave a duplicate.
export const createUpdatePost = (deps: PublishPostDeps): UpdatePost => {
  const publishPost = createPublishPost(deps);
  return async (input) => {
    if (!input.repost) return err({ step: 'update', platform: 'threads', cause: 'unsupported', message: 'Threads cannot edit a published post.' });
    const deleted = await deps.threads.deletePost(input.id);
    if (!deleted.ok) return err({ step: 'delete-old', platform: 'threads', cause: deleted.error.kind, message: deleted.error.message });
    const published = await publishPost(input);
    if (!published.ok) {
      const message = `The old post ${input.id} was deleted, but the new one was not published: ${published.error.message}`;
      return err({ ...published.error, message, details: { ...published.error.details, oldPostDeleted: input.id } });
    }
    return ok({ ...published.value, replaced: input.id });
  };
};
