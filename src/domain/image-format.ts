import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// Every image format a platform may take, known by the bytes it starts with rather than a file
// name, so a misled agent cannot upload a key file as a picture (D14, D28).
export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp' | 'tiff';

export type ImageFormatError = { readonly kind: 'invalid-image'; readonly message: string };

const ascii = (text: string): ReadonlyArray<number> => Array.from(text, (char) => char.codePointAt(0) ?? 0);

// A byte whose value does not matter: a size field inside the header.
const ANY = null;

// A WEBP is a RIFF file whose type, at byte 8, is WEBP. A BMP starts with "BM" (0x42 0x4d) and
// its two reserved words, bytes 6 to 9, are zero: "BM" alone could start a text. A TIFF starts
// with its byte order, then 42.
const SIGNATURES: ReadonlyArray<{ readonly format: ImageFormat; readonly bytes: ReadonlyArray<number | null> }> = [
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { format: 'gif', bytes: ascii('GIF87a') },
  { format: 'gif', bytes: ascii('GIF89a') },
  { format: 'webp', bytes: [...ascii('RIFF'), ANY, ANY, ANY, ANY, ...ascii('WEBP')] },
  { format: 'bmp', bytes: [0x42, 0x4d, ANY, ANY, ANY, ANY, 0, 0, 0, 0] },
  { format: 'tiff', bytes: [...ascii('II'), 0x2a, 0x00] },
  { format: 'tiff', bytes: [...ascii('MM'), 0x00, 0x2a] },
];

// A byte past the end reads as undefined, so a file shorter than the signature never matches.
const matches = (bytes: Uint8Array, signature: ReadonlyArray<number | null>): boolean => signature.every((byte, index) => byte === ANY || bytes[index] === byte);

const formatOf = (bytes: Uint8Array): ImageFormat | undefined => SIGNATURES.find((signature) => matches(bytes, signature.bytes))?.format;

// What one platform takes: its formats and size limit, and the words its refusals use.
export type ImageRule<F extends ImageFormat> = {
  readonly platform: string;
  readonly formats: ReadonlyArray<F>;
  readonly formatNames: string;
  readonly maxBytes: number;
  readonly maxLabel: string;
};

const isOneOf = <F extends ImageFormat>(formats: ReadonlyArray<F>, format: ImageFormat | undefined): format is F => new Set<ImageFormat | undefined>(formats).has(format);

const count = new Intl.NumberFormat('en-US');

export const checkImage = <F extends ImageFormat>(
  bytes: Uint8Array,
  name: string,
  rule: ImageRule<F>
): Result<{ readonly bytes: Uint8Array; readonly format: F }, ImageFormatError> => {
  if (bytes.length > rule.maxBytes) {
    const message = `"${name}" is ${count.format(bytes.length)} bytes; ${rule.platform} takes images of ${count.format(rule.maxBytes)} bytes (${rule.maxLabel}) at most.`;
    return err({ kind: 'invalid-image', message });
  }
  const format = formatOf(bytes);
  if (!isOneOf(rule.formats, format)) return err({ kind: 'invalid-image', message: `"${name}" is not a ${rule.formatNames} image.` });
  return ok({ bytes, format });
};
