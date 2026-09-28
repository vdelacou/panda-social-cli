import { describe, expect, it } from 'bun:test';
import { err, ok } from './result.ts';
import { parseXImage, X_IMAGE_MAX_BYTES } from './x-image.ts';

const ascii = (text: string): ReadonlyArray<number> => Array.from(text, (char) => char.codePointAt(0) ?? 0);

// The first bytes of each format, followed by a little made-up content.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const GIF87 = new Uint8Array([...ascii('GIF87a'), 0x01, 0x00]);
const GIF89 = new Uint8Array([...ascii('GIF89a'), 0x01, 0x00]);
const WEBP = new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBPVP8 ')]);

const pngOfSize = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  bytes.set(PNG);
  return bytes;
};

describe('an image for X', () => {
  it('a JPEG, a PNG, a GIF and a WEBP are recognised by their first bytes, whatever the file is called', () => {
    expect(parseXImage(JPEG, 'photo.png')).toEqual(ok({ bytes: JPEG, format: 'jpeg' }));
    expect(parseXImage(PNG, 'photo.jpg')).toEqual(ok({ bytes: PNG, format: 'png' }));
    expect(parseXImage(GIF87, 'old.gif')).toEqual(ok({ bytes: GIF87, format: 'gif' }));
    expect(parseXImage(GIF89, 'anim')).toEqual(ok({ bytes: GIF89, format: 'gif' }));
    expect(parseXImage(WEBP, 'photo.webp')).toEqual(ok({ bytes: WEBP, format: 'webp' }));
  });

  it('a file that only looks like an image is refused as invalid-image: a text file, a WAV, a PNG with one byte wrong, an odd GIF and an empty file', () => {
    const lookalikes = [
      new Uint8Array(ascii('Hello, not an image')),
      new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVEfmt ')]),
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b, 0x00]),
      new Uint8Array(ascii('GIF88a..')),
      new Uint8Array([]),
    ];

    for (const bytes of lookalikes) expect(parseXImage(bytes, 'cat.jpg')).toEqual(err({ kind: 'invalid-image', message: '"cat.jpg" is not a JPEG, PNG, GIF or WEBP image.' }));
  });

  it('an image of exactly 5 MB passes, and one byte more is refused, naming its size and the limit', () => {
    const largest = pngOfSize(X_IMAGE_MAX_BYTES);

    expect(X_IMAGE_MAX_BYTES).toBe(5_242_880);
    expect(parseXImage(largest, 'big.png')).toEqual(ok({ bytes: largest, format: 'png' }));
    expect(parseXImage(pngOfSize(X_IMAGE_MAX_BYTES + 1), 'big.png')).toEqual(
      err({ kind: 'invalid-image', message: '"big.png" is 5,242,881 bytes; X takes images of 5,242,880 bytes (5 MB) at most.' })
    );
  });
});
