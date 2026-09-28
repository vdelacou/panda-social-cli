import { describe, expect, it } from 'bun:test';
import { imagePathUnsafe, parseImagePath } from './image-path.ts';
import { err, ok } from './result.ts';

describe('the path of a local image', () => {
  it('an image for X is a local path: a relative or absolute path passes, an empty one is refused, and a URL is refused with the advice to download it', () => {
    for (const raw of ['./cat.jpg', '/home/panda/cat.png', 'photos/cat.webp']) expect(parseImagePath(raw)).toEqual(ok(imagePathUnsafe(raw)));

    expect(parseImagePath('')).toEqual(err({ kind: 'invalid-image', message: 'The image path is empty.' }));
    for (const raw of ['https://cdn.example.com/cat.jpg', 'http://example.com/a.png', 'ftp://example.com/b.gif']) {
      expect(parseImagePath(raw)).toEqual(err({ kind: 'invalid-image', message: `"${raw}" is a URL, not a local file: download it first, then pass its path.` }));
    }
  });
});
