import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { LoadedInstagramToken } from './load-instagram-token.ts';
import type { Instagram, InstagramAccount, Quota } from './ports/instagram.ts';
import type { StepError } from './ports/step-error.ts';
import { tokenReport } from './token-report.ts';
import type { TokenReport } from './token-report.ts';

// Where the token came from: PANDA_SOCIAL_INSTAGRAM_TOKEN, or the profile's saved credentials.
export type InstagramTokenOrigin = { readonly source: 'environment' } | ({ readonly source: 'saved' } & LoadedInstagramToken);

export type InstagramStatusInput = {
  readonly profile: ProfileName;
  readonly origin: InstagramTokenOrigin;
};

export type InstagramStatusSummary = {
  readonly platform: 'instagram';
  readonly profile: ProfileName;
  readonly account: InstagramAccount;
  readonly token: TokenReport;
  readonly limits: { readonly posts: Quota };
};

export type InstagramStatus = (input: InstagramStatusInput) => Promise<Result<InstagramStatusSummary, StepError>>;

export type InstagramStatusDeps = {
  readonly instagram: Instagram;
  readonly now: () => Date;
};

// D33: whose token it is, then that account's posts quota; a refused token stops at the first call.
export const createInstagramStatus =
  (deps: InstagramStatusDeps): InstagramStatus =>
  async (input) => {
    const account = await deps.instagram.whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const posts = await deps.instagram.publishingLimit(account.value.userId);
    if (!posts.ok) return err({ step: 'limits', cause: posts.error.kind, message: posts.error.message });
    return ok({ platform: 'instagram', profile: input.profile, account: account.value, token: tokenReport(input.origin, deps.now()), limits: { posts: posts.value } });
  };
