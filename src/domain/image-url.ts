import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// Threads and Instagram download the image themselves, so it must be a public https URL;
// credentials in a URL would be handed to Meta, so they are refused too (rule 12).
export type ImageUrl = string & { readonly __brand: 'ImageUrl' };

export type ImageUrlError = { readonly kind: 'invalid-image'; readonly message: string };

const isPublicHttps = (url: URL): boolean => url.protocol === 'https:' && url.username === '' && url.password === '';

export const parseImageUrl = (raw: string): Result<ImageUrl, ImageUrlError> => {
  const url = URL.canParse(raw) ? new URL(raw) : undefined;
  if (!url || !isPublicHttps(url)) return err({ kind: 'invalid-image', message: `Not a public https image URL: "${raw}".` });
  return ok(url.href as ImageUrl);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const imageUrlUnsafe = (value: string): ImageUrl => value as ImageUrl;
