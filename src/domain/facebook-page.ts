import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A Page id goes into Graph URL paths (the Page, its feed, its photos), so only digits get
// through (rule 12), whether it comes from --page, the environment or the credentials file.
export type FacebookPageId = string & { readonly __brand: 'FacebookPageId' };

export type FacebookPageIdError = { readonly kind: 'invalid-page-id'; readonly message: string };

const DIGITS = /^\d+$/;

export const parseFacebookPageId = (raw: string): Result<FacebookPageId, FacebookPageIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-page-id', message: `Not a Facebook Page id: "${raw}".` });
  return ok(raw as FacebookPageId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const facebookPageIdUnsafe = (value: string): FacebookPageId => value as FacebookPageId;

// A Page a user token grants: its own Page token, and the user's tasks on it (null when Meta
// lists none).
export type GrantedPage = {
  readonly id: FacebookPageId;
  readonly name: string;
  readonly token: string;
  readonly tasks: ReadonlyArray<string> | null;
};
