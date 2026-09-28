import type { ImagePath } from '../domain/image-path.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseXImage, X_IMAGE_MAX_BYTES } from '../domain/x-image.ts';
import { X_TEXT_LIMIT, xTextLength } from '../domain/x-text.ts';
import type { ImageFiles } from './ports/image-files.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';
import type { X } from './ports/x.ts';

export type XPostDeps = {
  readonly x: X;
  readonly logger: Logger;
};

export type XPublishDeps = XPostDeps & { readonly files: ImageFiles };

export type XPublishError = StepError & { readonly platform: 'x' };

export type XPublishSummary = {
  readonly platform: 'x';
  readonly id: string;
  readonly url: string;
  // The reply ids of a split thread, in order; absent for a single post.
  readonly replies?: ReadonlyArray<string>;
};

// A post's text, empty beside an image, with its length as X counts it and whether it fits.
export type MeasuredText = {
  readonly text: string;
  readonly length: number;
  readonly fits: boolean;
};

export const measureText = (text = ''): MeasuredText => {
  const length = xTextLength(text);
  return { text, length, fits: length <= X_TEXT_LIMIT };
};

const invalidImage = (message: string): Result<never, XPublishError> => err({ step: 'validate', platform: 'x', cause: 'invalid-image', message });

// The media ids a post carries: none without an image; else the file read, proven an image
// by its first bytes, and uploaded, all before anything is posted.
export const attachImage = async (deps: XPublishDeps, path: ImagePath | undefined): Promise<Result<ReadonlyArray<string> | undefined, XPublishError>> => {
  if (path === undefined) return ok(undefined);
  const read = await deps.files.read(path, X_IMAGE_MAX_BYTES);
  if (!read.ok) return invalidImage(read.error.message);
  const image = parseXImage(read.value, path);
  if (!image.ok) return invalidImage(image.error.message);
  const uploaded = await deps.x.uploadImage(image.value);
  if (!uploaded.ok) {
    const cause = uploaded.error.kind === 'rejected' ? 'image-rejected' : uploaded.error.kind;
    return err({ step: 'upload', platform: 'x', cause, message: uploaded.error.message });
  }
  return ok([uploaded.value]);
};
