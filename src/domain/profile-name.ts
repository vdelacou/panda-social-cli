import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A profile name becomes a key in the credentials file (rule 12): it starts with a
// lowercase letter or digit, so `__proto__` and friends can never be one.
export type ProfileName = string & { readonly __brand: 'ProfileName' };

export type ProfileNameError = { readonly kind: 'invalid-profile'; readonly message: string };

const PROFILE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const parseProfileName = (raw: string): Result<ProfileName, ProfileNameError> => {
  if (!PROFILE_PATTERN.test(raw)) return err({ kind: 'invalid-profile', message: `Invalid profile name: "${raw}".` });
  return ok(raw as ProfileName);
};

// The literal satisfies PROFILE_PATTERN; it is the profile used when none is named.
export const DEFAULT_PROFILE = 'default' as ProfileName;

// Test escape hatch (references/testing.md): a brand cast without validation. Production
// code cannot import it; the layer zones ban every `*Unsafe` import outside tests and fakes.
export const profileNameUnsafe = (value: string): ProfileName => value as ProfileName;
