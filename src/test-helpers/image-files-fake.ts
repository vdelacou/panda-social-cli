import { err, ok } from '../domain/result.ts';
import type { ImageFiles } from '../use-cases/ports/image-files.ts';

export type ImageFilesFake = ImageFiles & {
  // Every path read, in order.
  readonly reads: ReadonlyArray<string>;
};

// Files served from memory by path; any other path is missing, as on a real disk.
export const createImageFilesFake = (files: Readonly<Record<string, Uint8Array>> = {}): ImageFilesFake => {
  const reads: string[] = [];
  return {
    reads,
    read: async (path) => {
      reads.push(path);
      const bytes = Object.hasOwn(files, path) ? files[path] : undefined;
      if (bytes === undefined) return err({ kind: 'invalid-image', message: `No file at "${path}".` });
      return ok(bytes);
    },
  };
};
