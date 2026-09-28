import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A post id goes into an X URL path, so only 1 to 19 digits get through (rule 12), the
// shape X's own API documents for a post id.
export type XPostId = string & { readonly __brand: 'XPostId' };

export type XPostIdError = { readonly kind: 'invalid-post-id'; readonly message: string };

const DIGITS = /^\d{1,19}$/;

const refusal = (raw: string): string => `Not an X post id: "${raw}".`;

// For outside input: a user's --id, a library caller's argument.
export const parseXPostId = (raw: string): Result<XPostId, XPostIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-post-id', message: refusal(raw) });
  return ok(raw as XPostId);
};

// For an id already proven, such as one the X adapter checked: a failure is a bug.
export const xPostId = (value: string): XPostId => {
  if (!DIGITS.test(value)) throw new Error(refusal(value));
  return value as XPostId;
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const xPostIdUnsafe = (value: string): XPostId => value as XPostId;
