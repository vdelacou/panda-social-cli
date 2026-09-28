import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { createImageFiles } from './image-files.ts';

describe('reading a local image file', () => {
  let folder = '';
  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), 'panda-images-'));
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('reading an image file answers its bytes', async () => {
    const file = path.join(folder, 'cat.png');
    writeFileSync(file, new Uint8Array([1, 2, 3]));

    const result = await createImageFiles().read(imagePathUnsafe(file), 10);

    expect(result).toEqual({ ok: true, value: new Uint8Array([1, 2, 3]) });
  });

  it('a missing file, a folder and a file over the limit are refused as invalid-image, each saying why', async () => {
    const missing = path.join(folder, 'missing.png');
    const album = path.join(folder, 'album');
    const big = path.join(folder, 'big.png');
    mkdirSync(album);
    writeFileSync(big, new Uint8Array(11));
    const files = createImageFiles();

    expect(await files.read(imagePathUnsafe(missing), 10)).toEqual({ ok: false, error: { kind: 'invalid-image', message: `No file at "${missing}".` } });
    expect(await files.read(imagePathUnsafe(album), 10)).toEqual({ ok: false, error: { kind: 'invalid-image', message: expect.stringContaining(`"${album}"`) } });
    expect(await files.read(imagePathUnsafe(big), 10)).toEqual({ ok: false, error: { kind: 'invalid-image', message: `"${big}" is 11 bytes, over the limit of 10.` } });
  });
});
