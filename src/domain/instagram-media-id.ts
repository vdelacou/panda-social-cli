import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// The id of a published Instagram post goes into URL paths (its permalink, and a delete once
// Facebook Login brings one), so only digits get through (rule 12).
export type InstagramMediaId = string & { readonly __brand: 'InstagramMediaId' };

export type InstagramMediaIdError = { readonly kind: 'invalid-post-id'; readonly message: string };

const DIGITS = /^\d+$/;

// For outside input: a user's --id, a library caller's argument, an id Instagram answered.
export const parseInstagramMediaId = (raw: string): Result<InstagramMediaId, InstagramMediaIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-post-id', message: `Not an Instagram post id: "${raw}".` });
  return ok(raw as InstagramMediaId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const instagramMediaIdUnsafe = (value: string): InstagramMediaId => value as InstagramMediaId;
