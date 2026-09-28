import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// The professional account id Instagram gives as `user_id` goes into URL paths (the quota,
// and publishing in 5.2), so only digits get through (rule 12).
export type InstagramUserId = string & { readonly __brand: 'InstagramUserId' };

export type InstagramUserIdError = { readonly kind: 'invalid-user-id'; readonly message: string };

const DIGITS = /^\d+$/;

export const parseInstagramUserId = (raw: string): Result<InstagramUserId, InstagramUserIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-user-id', message: `Not an Instagram account id: "${raw}".` });
  return ok(raw as InstagramUserId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const instagramUserIdUnsafe = (value: string): InstagramUserId => value as InstagramUserId;
