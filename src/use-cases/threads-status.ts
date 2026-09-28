import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { LoadedThreadsToken } from './load-threads-token.ts';
import type { StepError } from './ports/step-error.ts';
import type { PublishingLimits, Threads, ThreadsAccount } from './ports/threads.ts';
import { tokenReport } from './token-report.ts';
import type { TokenReport } from './token-report.ts';

// Where the token came from: PANDA_SOCIAL_THREADS_TOKEN, or the profile's saved credentials.
export type TokenOrigin = { readonly source: 'environment' } | ({ readonly source: 'saved' } & LoadedThreadsToken);

export type ThreadsStatusInput = {
  readonly profile: ProfileName;
  readonly origin: TokenOrigin;
};

export type ThreadsStatusSummary = {
  readonly platform: 'threads';
  readonly profile: ProfileName;
  readonly account: ThreadsAccount;
  readonly token: TokenReport;
  readonly limits: PublishingLimits;
};

export type ThreadsStatus = (input: ThreadsStatusInput) => Promise<Result<ThreadsStatusSummary, StepError>>;

export type ThreadsStatusDeps = {
  readonly threads: Threads;
  readonly now: () => Date;
};

// Whose token it is, then the quotas for that account: a refused token stops at the first call.
export const createThreadsStatus =
  (deps: ThreadsStatusDeps): ThreadsStatus =>
  async (input) => {
    const account = await deps.threads.whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const limits = await deps.threads.publishingLimits(account.value.userId);
    if (!limits.ok) return err({ step: 'limits', cause: limits.error.kind, message: limits.error.message });
    return ok({ platform: 'threads', profile: input.profile, account: account.value, token: tokenReport(input.origin, deps.now()), limits: limits.value });
  };
