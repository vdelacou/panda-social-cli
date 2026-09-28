import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// X takes a JPEG, PNG, GIF or WEBP of 5 MB at most through its simple upload (D14,
// docs.x.com media best practices, checked 2026-09-28).
export const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type XImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';

// Bytes proven to be one of those images, by their first bytes rather than a file name, so
// a misled agent cannot upload a key file as a picture (D14).
export type XImage = {
  readonly bytes: Uint8Array;
  readonly format: XImageFormat;
};

export type XImageError = { readonly kind: 'invalid-image'; readonly message: string };

const ascii = (text: string): ReadonlyArray<number> => Array.from(text, (char) => char.codePointAt(0) ?? 0);

// A byte whose value does not matter: the size a WEBP's RIFF header gives at bytes 4 to 7.
const ANY = null;

// Each format by the bytes it starts with: a WEBP is a RIFF file whose type, at byte 8, is WEBP.
const SIGNATURES: ReadonlyArray<{ readonly format: XImageFormat; readonly bytes: ReadonlyArray<number | null> }> = [
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { format: 'gif', bytes: ascii('GIF87a') },
  { format: 'gif', bytes: ascii('GIF89a') },
  { format: 'webp', bytes: [...ascii('RIFF'), ANY, ANY, ANY, ANY, ...ascii('WEBP')] },
];

// A byte past the end reads as undefined, so a file shorter than the signature never matches.
const matches = (bytes: Uint8Array, signature: ReadonlyArray<number | null>): boolean => signature.every((byte, index) => byte === ANY || bytes[index] === byte);

const formatOf = (bytes: Uint8Array): XImageFormat | undefined => SIGNATURES.find((signature) => matches(bytes, signature.bytes))?.format;

const count = new Intl.NumberFormat('en-US');

export const parseXImage = (bytes: Uint8Array, name: string): Result<XImage, XImageError> => {
  if (bytes.length > X_IMAGE_MAX_BYTES) {
    return err({ kind: 'invalid-image', message: `"${name}" is ${count.format(bytes.length)} bytes; X takes images of ${count.format(X_IMAGE_MAX_BYTES)} bytes (5 MB) at most.` });
  }
  const format = formatOf(bytes);
  if (format === undefined) return err({ kind: 'invalid-image', message: `"${name}" is not a JPEG, PNG, GIF or WEBP image.` });
  return ok({ bytes, format });
};
