import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// The path of an image on this machine, which the CLI reads and uploads itself (X, D14): a
// URL is refused, since the CLI never downloads anything on a caller's behalf.
export type ImagePath = string & { readonly __brand: 'ImagePath' };

export type ImagePathError = { readonly kind: 'invalid-image'; readonly message: string };

// A scheme and `://` mark a URL, whatever the scheme; no local path holds them.
export const parseImagePath = (raw: string): Result<ImagePath, ImagePathError> => {
  if (raw === '') return err({ kind: 'invalid-image', message: 'The image path is empty.' });
  if (raw.includes('://')) return err({ kind: 'invalid-image', message: `"${raw}" is a URL, not a local file: download it first, then pass its path.` });
  return ok(raw as ImagePath);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const imagePathUnsafe = (value: string): ImagePath => value as ImagePath;
