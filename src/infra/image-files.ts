import { readFile, stat } from 'node:fs/promises';
import type { ImagePath } from '../domain/image-path.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { formatError } from '../domain/utilities/format-error.ts';
import type { ImageFileError, ImageFiles } from '../use-cases/ports/image-files.ts';

// Rule 20's commented exception, as in credential-store-file.ts: the published CLI also
// runs on Node, where Bun.file does not exist; node:fs/promises reads on both runtimes.

const isMissing = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

const invalid = (message: string): Result<never, ImageFileError> => err({ kind: 'invalid-image', message });

const count = new Intl.NumberFormat('en-US');

// The size is known before a byte is read, so an oversized file is refused unread.
const readImage = async (path: ImagePath, maxBytes: number): Promise<Result<Uint8Array, ImageFileError>> => {
  try {
    const info = await stat(path);
    if (!info.isFile()) return invalid(`"${path}" is not a file.`);
    if (info.size > maxBytes) return invalid(`"${path}" is ${count.format(info.size)} bytes, over the limit of ${count.format(maxBytes)}.`);
    return ok(new Uint8Array(await readFile(path)));
  } catch (error) {
    if (isMissing(error)) return invalid(`No file at "${path}".`);
    return invalid(`"${path}" could not be read: ${formatError(error)}.`);
  }
};

export const createImageFiles = (): ImageFiles => ({ read: readImage });
