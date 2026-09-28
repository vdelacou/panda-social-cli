import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Facebook, FacebookPage } from './ports/facebook.ts';
import type { StepError } from './ports/step-error.ts';

// Where the Page token came from: the two PANDA_SOCIAL_FACEBOOK_ variables, or the profile's saved Page.
export type FacebookTokenOrigin = { readonly source: 'environment' } | { readonly source: 'saved'; readonly savedAt: string };

export type FacebookStatusInput = {
  readonly profile: ProfileName;
  readonly origin: FacebookTokenOrigin;
};

export type FacebookStatusSummary = {
  readonly platform: 'facebook';
  readonly profile: ProfileName;
  readonly page: FacebookPage;
  readonly token: FacebookTokenOrigin;
};

export type FacebookStatus = (input: FacebookStatusInput) => Promise<Result<FacebookStatusSummary, StepError>>;

export type FacebookStatusDeps = { readonly facebook: Facebook };

// D24: one read of /me with the Page token, which answers the Page it belongs to.
export const createFacebookStatus =
  (deps: FacebookStatusDeps): FacebookStatus =>
  async (input) => {
    const page = await deps.facebook.whoAmI();
    if (!page.ok) return err({ step: 'verify', cause: page.error.kind, message: page.error.message });
    return ok({ platform: 'facebook', profile: input.profile, page: page.value, token: input.origin });
  };
