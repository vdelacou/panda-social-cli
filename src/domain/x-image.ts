import { checkImage } from './image-format.ts';
import type { ImageRule } from './image-format.ts';
import type { Result } from './result.ts';

// X takes a JPEG, PNG, GIF or WEBP of 5 MB at most through its simple upload (D14,
// docs.x.com media best practices, checked 2026-09-28).
export const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type XImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';

// Bytes proven to be one of those images, by their first bytes rather than a file name, so
// a misled agent cannot upload a key file as a picture (D14).
export type XImage = {
  readonly bytes: Uint8Array;
  readonly format: XImageFormat;
};

export type XImageError = { readonly kind: 'invalid-image'; readonly message: string };

const X_RULE: ImageRule<XImageFormat> = {
  platform: 'X',
  formats: ['jpeg', 'png', 'gif', 'webp'],
  formatNames: 'JPEG, PNG, GIF or WEBP',
  maxBytes: X_IMAGE_MAX_BYTES,
  maxLabel: '5 MB',
};

export const parseXImage = (bytes: Uint8Array, name: string): Result<XImage, XImageError> => checkImage(bytes, name, X_RULE);
