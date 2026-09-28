import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { StepError } from './ports/step-error.ts';
import type { X } from './ports/x.ts';

// Where the keys came from: the four PANDA_SOCIAL_X_ variables, or the profile's saved keys.
export type XKeysOrigin = { readonly source: 'environment' } | { readonly source: 'saved'; readonly savedAt: string };

export type XStatusInput = {
  readonly profile: ProfileName;
  readonly origin: XKeysOrigin;
};

export type XStatusSummary = {
  readonly platform: 'x';
  readonly profile: ProfileName;
  readonly account: { readonly userId: string; readonly username: string };
  readonly accessLevel: string | null;
  readonly keys: XKeysOrigin;
};

export type XStatus = (input: XStatusInput) => Promise<Result<XStatusSummary, StepError>>;

export type XStatusDeps = { readonly x: X };

// One read of /2/users/me: whose keys they are and whether they may post. X keeps the
// credit balance and the rate windows away from OAuth 1.0a keys, so neither is shown.
export const createXStatus =
  (deps: XStatusDeps): XStatus =>
  async (input) => {
    const account = await deps.x.whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const { userId, username, accessLevel } = account.value;
    return ok({ platform: 'x', profile: input.profile, account: { userId, username }, accessLevel, keys: input.origin });
  };
