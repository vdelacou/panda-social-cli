import type { ImageUrl } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Instagram, InstagramPublishedPost } from './ports/instagram.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';

// D34: an Instagram post is an image, with the text as its caption when there is one.
export type InstagramPostInput = {
  readonly imageUrl: ImageUrl;
  readonly caption?: string;
};

export type InstagramPublishSummary = InstagramPublishedPost & { readonly platform: 'instagram' };

export type InstagramPublishError = StepError & { readonly platform: 'instagram' };

export type PublishInstagramPost = (input: InstagramPostInput) => Promise<Result<InstagramPublishSummary, InstagramPublishError>>;

export type InstagramPostDeps = {
  readonly instagram: Instagram;
  readonly logger: Logger;
};

// D35: the account comes from /me each time, so a saved token and PANDA_SOCIAL_INSTAGRAM_TOKEN
// post the same way; a refused token stops before any container is made.
export const createPublishInstagramPost =
  (deps: InstagramPostDeps): PublishInstagramPost =>
  async (input) => {
    const account = await deps.instagram.whoAmI();
    if (!account.ok) return err({ step: 'verify', platform: 'instagram', cause: account.error.kind, message: account.error.message });
    const published = await deps.instagram.publishImage(account.value.userId, input.imageUrl, input.caption);
    if (!published.ok) {
      deps.logger.warn('instagram.publish.failed', { cause: published.error.kind });
      return err({ step: 'publish', platform: 'instagram', cause: published.error.kind, message: published.error.message });
    }
    return ok({ platform: 'instagram', ...published.value });
  };
