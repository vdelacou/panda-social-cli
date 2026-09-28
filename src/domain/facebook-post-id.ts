import { isGraphNumber } from './facebook-page.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A Page post id is the Page id and the post's own number, joined by an underscore, as
// `104000000000001_122000000000001`. It goes into Graph URL paths, so both sides must be
// digits (rule 12).
export type FacebookPostId = string & { readonly __brand: 'FacebookPostId' };

export type FacebookPostIdError = { readonly kind: 'invalid-post-id'; readonly message: string };

const isPostId = (raw: string): boolean => {
  const underscore = raw.indexOf('_');
  return underscore !== -1 && isGraphNumber(raw.slice(0, underscore)) && isGraphNumber(raw.slice(underscore + 1));
};

// For outside input: a user's --id, a library caller's argument, an id Meta answered.
export const parseFacebookPostId = (raw: string): Result<FacebookPostId, FacebookPostIdError> => {
  if (!isPostId(raw)) return err({ kind: 'invalid-post-id', message: `Not a Facebook post id: "${raw}".` });
  return ok(raw as FacebookPostId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const facebookPostIdUnsafe = (value: string): FacebookPostId => value as FacebookPostId;
