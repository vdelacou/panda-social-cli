import type { ImagePath } from '../../domain/image-path.ts';
import type { Result } from '../../domain/result.ts';

export type ImageFileError = { readonly kind: 'invalid-image'; readonly message: string };

// The bytes of a local image, refused without being read when the file is over `maxBytes`.
export type ImageFiles = {
  readonly read: (path: ImagePath, maxBytes: number) => Promise<Result<Uint8Array, ImageFileError>>;
};
