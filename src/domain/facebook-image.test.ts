import { describe, expect, it } from 'bun:test';
import { FACEBOOK_IMAGE_MAX_BYTES, parseFacebookImage } from './facebook-image.ts';
import { err, ok } from './result.ts';

const ascii = (text: string): ReadonlyArray<number> => Array.from(text, (char) => char.codePointAt(0) ?? 0);

// The first bytes of each format, followed by a little made-up content.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const GIF = new Uint8Array([...ascii('GIF89a'), 0x01, 0x00]);
// "BM", the file size, two reserved words of zero, then where the pixels start.
const BMP = new Uint8Array([...ascii('BM'), 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00]);
const TIFF_INTEL = new Uint8Array([...ascii('II'), 0x2a, 0x00, 0x08, 0x00]);
const TIFF_MOTOROLA = new Uint8Array([...ascii('MM'), 0x00, 0x2a, 0x00, 0x08]);

const pngOfSize = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  bytes.set(PNG);
  return bytes;
};

describe('a local image for Facebook', () => {
  it('a JPEG, a PNG, a GIF, a BMP and a TIFF in either byte order are recognised by their first bytes, whatever the file is called', () => {
    expect(parseFacebookImage(JPEG, 'photo.bin')).toEqual(ok({ bytes: JPEG, format: 'jpeg' }));
    expect(parseFacebookImage(PNG, 'photo.bin')).toEqual(ok({ bytes: PNG, format: 'png' }));
    expect(parseFacebookImage(GIF, 'photo.bin')).toEqual(ok({ bytes: GIF, format: 'gif' }));
    expect(parseFacebookImage(BMP, 'photo.bin')).toEqual(ok({ bytes: BMP, format: 'bmp' }));
    expect(parseFacebookImage(TIFF_INTEL, 'scan.bin')).toEqual(ok({ bytes: TIFF_INTEL, format: 'tiff' }));
    expect(parseFacebookImage(TIFF_MOTOROLA, 'scan.bin')).toEqual(ok({ bytes: TIFF_MOTOROLA, format: 'tiff' }));
  });

  it('a WEBP, a text that starts with "BM", a WAV and an empty file are refused as invalid-image', () => {
    const refused: ReadonlyArray<readonly [string, Uint8Array]> = [
      ['cat.webp', new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBPVP8 ')])],
      ['notes.bmp', new Uint8Array(ascii('BMW owners meet on Sunday'))],
      ['sound.wav', new Uint8Array([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVEfmt ')])],
      ['empty.png', new Uint8Array()],
    ];

    for (const [name, bytes] of refused) {
      expect(parseFacebookImage(bytes, name)).toEqual(err({ kind: 'invalid-image', message: `"${name}" is not a JPEG, PNG, GIF, BMP or TIFF image.` }));
    }
  });

  it('an image of exactly 10 MB passes, and one byte more is refused, naming its size and the limit', () => {
    expect(parseFacebookImage(pngOfSize(FACEBOOK_IMAGE_MAX_BYTES), 'big.png').ok).toBe(true);
    expect(parseFacebookImage(pngOfSize(FACEBOOK_IMAGE_MAX_BYTES + 1), 'big.png')).toEqual(
      err({ kind: 'invalid-image', message: '"big.png" is 10,485,761 bytes; Facebook takes images of 10,485,760 bytes (10 MB) at most.' })
    );
  });
});
