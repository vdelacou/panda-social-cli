import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XPostId } from '../domain/x-post-id.ts';
import { X_TEXT_LIMIT } from '../domain/x-text.ts';
import type { XError } from './ports/x.ts';
import { createPublishXPost } from './publish-x-post.ts';
import type { PublishXPost, PublishXPostInput } from './publish-x-post.ts';
import { attachImage, measureText } from './x-posting.ts';
import type { XPublishDeps, XPublishError, XPublishSummary } from './x-posting.ts';

export type UpdateXPostInput = PublishXPostInput & {
  readonly id: XPostId;
  // Delete the post and publish the new one in its place, instead of editing it (D18).
  readonly repost: boolean;
};

// An edit answers the new version's id with the post it edits; a repost, the post it replaced.
export type XUpdateSummary = XPublishSummary & ({ readonly edited: string } | { readonly replaced: string });

export type UpdateXPost = (input: UpdateXPostInput) => Promise<Result<XUpdateSummary, XPublishError>>;

const editTooLong = (length: number): Result<never, XPublishError> =>
  err({
    step: 'validate',
    platform: 'x',
    cause: 'text-too-long',
    message: `An edit replaces one post, and the text counts ${length} characters the way X counts them; the limit is ${X_TEXT_LIMIT}. Shorten it, or pass --repost to publish it as a new post or thread.`,
  });

// A 403 on an edit is X declining it: no X Premium, the window closed, or the edits used up.
const editFailed = (id: XPostId, error: XError): Result<never, XPublishError> => {
  if (error.kind === 'forbidden') return err({ step: 'edit', platform: 'x', cause: 'edit-refused', message: `X refused to edit post ${id}: ${error.message}` });
  return err({ step: 'edit', platform: 'x', cause: error.kind, message: error.message });
};

const edit = async (deps: XPublishDeps, input: UpdateXPostInput): Promise<Result<XUpdateSummary, XPublishError>> => {
  const measured = measureText(input.text);
  if (!measured.fits) return editTooLong(measured.length);
  const media = await attachImage(deps, input.imagePath);
  if (!media.ok) return media;
  const edited = await deps.x.createPost({ text: measured.text, ...(media.value && { mediaIds: media.value }), editOf: input.id });
  if (!edited.ok) return editFailed(input.id, edited.error);
  return ok({ platform: 'x', ...edited.value, edited: input.id });
};

// Delete first: a delete X refuses then changes nothing, where publishing first would leave a duplicate.
const repost = async (deps: XPublishDeps, publish: PublishXPost, input: UpdateXPostInput): Promise<Result<XUpdateSummary, XPublishError>> => {
  const deleted = await deps.x.deletePost(input.id);
  if (!deleted.ok) return err({ step: 'delete-old', platform: 'x', cause: deleted.error.kind, message: deleted.error.message });
  const published = await publish(input);
  if (!published.ok) {
    const message = `The old post ${input.id} was deleted, but the new one was not published: ${published.error.message}`;
    return err({ ...published.error, message, details: { ...published.error.details, oldPostDeleted: input.id } });
  }
  return ok({ ...published.value, replaced: input.id });
};

export const createUpdateXPost = (deps: XPublishDeps): UpdateXPost => {
  const publish = createPublishXPost(deps);
  return async (input) => (input.repost ? repost(deps, publish, input) : edit(deps, input));
};
