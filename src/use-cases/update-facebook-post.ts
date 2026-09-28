import { isTextPost } from '../domain/facebook-post.ts';
import type { FacebookPostId } from '../domain/facebook-post-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { FacebookPostInput, FacebookPublishDeps, FacebookPublishError, FacebookPublishSummary } from './facebook-posting.ts';
import type { FacebookError } from './ports/facebook.ts';
import { createPublishFacebookPost } from './publish-facebook-post.ts';
import type { PublishFacebookPost } from './publish-facebook-post.ts';

export type UpdateFacebookPostInput = FacebookPostInput & {
  readonly id: FacebookPostId;
  // Delete the post and publish the new one in its place, instead of editing it (D27).
  readonly repost: boolean;
};

// An edit keeps the post's id and link, answered with the post it edited; a repost answers the
// new post with the one it replaced.
export type FacebookUpdateSummary = FacebookPublishSummary & ({ readonly edited: string } | { readonly replaced: string });

export type UpdateFacebookPost = (input: UpdateFacebookPostInput) => Promise<Result<FacebookUpdateSummary, FacebookPublishError>>;

// Meta edits only posts this app made, so a refused edit is Meta declining it (D27).
const editFailed = (id: FacebookPostId, error: FacebookError): Result<never, FacebookPublishError> => {
  if (error.kind === 'forbidden') return err({ step: 'edit', platform: 'facebook', cause: 'edit-refused', message: `Facebook refused to edit post ${id}: ${error.message}` });
  return err({ step: 'edit', platform: 'facebook', cause: error.kind, message: error.message });
};

// An edit changes the text; a new image needs --repost.
const edit = async (deps: FacebookPublishDeps, input: UpdateFacebookPostInput): Promise<Result<FacebookUpdateSummary, FacebookPublishError>> => {
  if (!isTextPost(input)) return err({ step: 'update', platform: 'facebook', cause: 'unsupported', message: 'Facebook edits the text of a post, not its image.' });
  const edited = await deps.facebook.editText(input.id, input.text);
  if (!edited.ok) return editFailed(input.id, edited.error);
  return ok({ platform: 'facebook', ...edited.value, edited: input.id });
};

// Delete first: a delete Meta refuses then changes nothing, where publishing first would leave a duplicate.
const repost = async (deps: FacebookPublishDeps, publish: PublishFacebookPost, input: UpdateFacebookPostInput): Promise<Result<FacebookUpdateSummary, FacebookPublishError>> => {
  const deleted = await deps.facebook.deletePost(input.id);
  if (!deleted.ok) return err({ step: 'delete-old', platform: 'facebook', cause: deleted.error.kind, message: deleted.error.message });
  const published = await publish(input);
  if (!published.ok) {
    const message = `The old post ${input.id} was deleted, but the new one was not published: ${published.error.message}`;
    return err({ ...published.error, message, details: { ...published.error.details, oldPostDeleted: input.id } });
  }
  return ok({ ...published.value, replaced: input.id });
};

export const createUpdateFacebookPost = (deps: FacebookPublishDeps): UpdateFacebookPost => {
  const publish = createPublishFacebookPost(deps);
  return async (input) => (input.repost ? repost(deps, publish, input) : edit(deps, input));
};
