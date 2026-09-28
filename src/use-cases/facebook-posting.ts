import { FACEBOOK_IMAGE_MAX_BYTES, parseFacebookImage } from '../domain/facebook-image.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import type { FacebookPhotoPost, FacebookPostContent } from '../domain/facebook-post.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Facebook, FacebookPhoto } from './ports/facebook.ts';
import type { ImageFiles } from './ports/image-files.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';

export type FacebookPostDeps = {
  readonly facebook: Facebook;
  readonly logger: Logger;
};

export type FacebookPublishDeps = FacebookPostDeps & { readonly files: ImageFiles };

export type FacebookPublishError = StepError & { readonly platform: 'facebook' };

export type FacebookPublishSummary = {
  readonly platform: 'facebook';
  readonly id: string;
  readonly url: string;
};

// A Page post and the Page it goes to.
export type FacebookPostInput = FacebookPostContent & { readonly pageId: FacebookPageId };

const invalidImage = (message: string): Result<never, FacebookPublishError> => err({ step: 'validate', platform: 'facebook', cause: 'invalid-image', message });

// A URL goes as it is; a local file is read and proven an image by its first bytes before
// anything reaches Meta.
export const photoOf = async (files: ImageFiles, post: FacebookPhotoPost): Promise<Result<FacebookPhoto, FacebookPublishError>> => {
  if (post.imageUrl !== undefined) return ok({ kind: 'url', url: post.imageUrl });
  const read = await files.read(post.imagePath, FACEBOOK_IMAGE_MAX_BYTES);
  if (!read.ok) return invalidImage(read.error.message);
  const image = parseFacebookImage(read.value, post.imagePath);
  return image.ok ? ok({ kind: 'upload', image: image.value }) : invalidImage(image.error.message);
};
