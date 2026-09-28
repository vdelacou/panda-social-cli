import { isTextPost } from '../domain/facebook-post.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { photoOf } from './facebook-posting.ts';
import type { FacebookPostDeps, FacebookPostInput, FacebookPublishDeps, FacebookPublishError, FacebookPublishSummary } from './facebook-posting.ts';
import type { FacebookError, FacebookPublishedPost } from './ports/facebook.ts';

export type PublishFacebookPost = (input: FacebookPostInput) => Promise<Result<FacebookPublishSummary, FacebookPublishError>>;

// Meta's answer as the agent gets it: the post, or Meta's cause naming the publish step.
const settled = (deps: FacebookPostDeps, published: Result<FacebookPublishedPost, FacebookError>): Result<FacebookPublishSummary, FacebookPublishError> => {
  if (published.ok) return ok({ platform: 'facebook', ...published.value });
  deps.logger.warn('facebook.publish.failed', { cause: published.error.kind });
  return err({ step: 'publish', platform: 'facebook', cause: published.error.kind, message: published.error.message });
};

// A text goes to the feed whole: Facebook has no short limit to split for (D26). A photo
// carries the text as its caption, once the image is known to be one.
export const createPublishFacebookPost =
  (deps: FacebookPublishDeps): PublishFacebookPost =>
  async (input) => {
    if (isTextPost(input)) return settled(deps, await deps.facebook.publishText(input.pageId, input.text));
    const photo = await photoOf(deps.files, input);
    if (!photo.ok) return photo;
    return settled(deps, await deps.facebook.publishPhoto(input.pageId, photo.value, input.text));
  };
