import { checkImage } from './image-format.ts';
import type { ImageRule } from './image-format.ts';
import type { Result } from './result.ts';

// Facebook takes a JPEG, PNG, GIF, BMP or TIFF of 10 MB at most as a Page photo (D26, the Page
// photos reference, checked 2026-09-28).
export const FACEBOOK_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export type FacebookImageFormat = 'jpeg' | 'png' | 'gif' | 'bmp' | 'tiff';

// Bytes proven to be one of those images, by their first bytes rather than a file name.
export type FacebookImage = {
  readonly bytes: Uint8Array;
  readonly format: FacebookImageFormat;
};

export type FacebookImageError = { readonly kind: 'invalid-image'; readonly message: string };

const FACEBOOK_RULE: ImageRule<FacebookImageFormat> = {
  platform: 'Facebook',
  formats: ['jpeg', 'png', 'gif', 'bmp', 'tiff'],
  formatNames: 'JPEG, PNG, GIF, BMP or TIFF',
  maxBytes: FACEBOOK_IMAGE_MAX_BYTES,
  maxLabel: '10 MB',
};

export const parseFacebookImage = (bytes: Uint8Array, name: string): Result<FacebookImage, FacebookImageError> => checkImage(bytes, name, FACEBOOK_RULE);
