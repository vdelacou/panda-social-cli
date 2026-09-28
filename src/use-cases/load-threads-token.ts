import { isRefreshDue, refreshedCredentials, threadsCredentialsFor, withThreadsCredentials } from '../domain/credentials.ts';
import type { ThreadsCredentials } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';
import type { Threads } from './ports/threads.ts';

export type LoadThreadsTokenInput = { readonly profile: ProfileName };

// The credentials to act with, and whether this load refreshed their token.
export type LoadedThreadsToken = {
  readonly credentials: ThreadsCredentials;
  readonly refreshed: boolean;
};

export type LoadThreadsToken = (input: LoadThreadsTokenInput) => Promise<Result<LoadedThreadsToken, StepError>>;

export type LoadThreadsTokenDeps = {
  readonly store: CredentialStore;
  readonly threadsFor: (token: string) => Threads;
  readonly now: () => Date;
  readonly logger: Logger;
};

export const missingThreadsToken = (profile: ProfileName): StepError => ({
  step: 'load',
  cause: 'missing-credentials',
  message: `No Threads token is configured for the "${profile}" profile.`,
});

// A refreshed token is saved before it is used. A refresh or a save that fails never stops
// the command: the token in hand still works until it expires, and the warning says why.
const saveRefreshed = async (deps: LoadThreadsTokenDeps, profile: ProfileName, next: ThreadsCredentials): Promise<LoadedThreadsToken> => {
  const saved = await deps.store.update((current) => withThreadsCredentials(current, profile, next));
  if (!saved.ok) {
    deps.logger.warn('threads.token.save-failed', { cause: saved.error.kind });
    return { credentials: next, refreshed: true };
  }
  deps.logger.info('threads.token.refreshed');
  return { credentials: next, refreshed: true };
};

const refresh = async (deps: LoadThreadsTokenDeps, profile: ProfileName, credentials: ThreadsCredentials): Promise<LoadedThreadsToken> => {
  const refreshed = await deps.threadsFor(credentials.token).refreshToken();
  if (!refreshed.ok) {
    deps.logger.warn('threads.token.refresh-failed', { cause: refreshed.error.kind });
    return { credentials, refreshed: false };
  }
  return saveRefreshed(deps, profile, refreshedCredentials(credentials, refreshed.value, deps.now()));
};

export const createLoadThreadsToken =
  (deps: LoadThreadsTokenDeps): LoadThreadsToken =>
  async (input) => {
    const file = await deps.store.load();
    if (!file.ok) return err({ step: 'load', cause: file.error.kind, message: file.error.message });
    const credentials = threadsCredentialsFor(file.value, input.profile);
    if (credentials === undefined) return err(missingThreadsToken(input.profile));
    if (!isRefreshDue(credentials, deps.now())) return ok({ credentials, refreshed: false });
    return ok(await refresh(deps, input.profile, credentials));
  };
