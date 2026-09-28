import { instagramCredentialsFor, withInstagramCredentials } from '../domain/credentials.ts';
import type { InstagramCredentials } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { isRefreshDue, refreshedCredentials } from '../domain/token-renewal.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { Instagram } from './ports/instagram.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';

export type LoadInstagramTokenInput = { readonly profile: ProfileName };

// The credentials to act with, and whether this load renewed their token.
export type LoadedInstagramToken = {
  readonly credentials: InstagramCredentials;
  readonly refreshed: boolean;
};

export type LoadInstagramToken = (input: LoadInstagramTokenInput) => Promise<Result<LoadedInstagramToken, StepError>>;

export type LoadInstagramTokenDeps = {
  readonly store: CredentialStore;
  readonly instagramFor: (token: string) => Instagram;
  readonly now: () => Date;
  readonly logger: Logger;
};

export const missingInstagramToken = (profile: ProfileName): StepError => ({
  step: 'load',
  cause: 'missing-credentials',
  message: `No Instagram token is configured for the "${profile}" profile.`,
});

// D31, as on Threads: a renewed token is saved before it is used, and a renewal or a save that
// fails never stops the command, since the token in hand works until it expires.
const saveRefreshed = async (deps: LoadInstagramTokenDeps, profile: ProfileName, next: InstagramCredentials): Promise<LoadedInstagramToken> => {
  const saved = await deps.store.update((current) => withInstagramCredentials(current, profile, next));
  if (!saved.ok) {
    deps.logger.warn('instagram.token.save-failed', { cause: saved.error.kind });
    return { credentials: next, refreshed: true };
  }
  deps.logger.info('instagram.token.refreshed');
  return { credentials: next, refreshed: true };
};

const refresh = async (deps: LoadInstagramTokenDeps, profile: ProfileName, credentials: InstagramCredentials): Promise<LoadedInstagramToken> => {
  const refreshed = await deps.instagramFor(credentials.token).refreshToken();
  if (!refreshed.ok) {
    deps.logger.warn('instagram.token.refresh-failed', { cause: refreshed.error.kind });
    return { credentials, refreshed: false };
  }
  return saveRefreshed(deps, profile, refreshedCredentials(credentials, refreshed.value, deps.now()));
};

export const createLoadInstagramToken =
  (deps: LoadInstagramTokenDeps): LoadInstagramToken =>
  async (input) => {
    const file = await deps.store.load();
    if (!file.ok) return err({ step: 'load', cause: file.error.kind, message: file.error.message });
    const credentials = instagramCredentialsFor(file.value, input.profile);
    if (credentials === undefined) return err(missingInstagramToken(input.profile));
    if (!isRefreshDue(credentials, deps.now())) return ok({ credentials, refreshed: false });
    return ok(await refresh(deps, input.profile, credentials));
  };
