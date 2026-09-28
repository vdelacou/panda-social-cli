import { withInstagramCredentials } from '../domain/credentials.ts';
import type { InstagramCredentials } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { Instagram, InstagramAccount } from './ports/instagram.ts';
import type { StepError } from './ports/step-error.ts';

export type ConnectInstagramInput = {
  readonly profile: ProfileName;
  readonly token: string;
};

export type ConnectInstagramSummary = InstagramAccount & {
  readonly platform: 'instagram';
  readonly profile: ProfileName;
};

export type ConnectInstagram = (input: ConnectInstagramInput) => Promise<Result<ConnectInstagramSummary, StepError>>;

export type ConnectInstagramDeps = {
  readonly instagramFor: (token: string) => Instagram;
  readonly store: CredentialStore;
  readonly now: () => Date;
};

// A token is saved only after Instagram confirms whose it is, so a stored token always names
// a real account and a typo never shadows a working one.
export const createConnectInstagram =
  (deps: ConnectInstagramDeps): ConnectInstagram =>
  async (input) => {
    const account = await deps.instagramFor(input.token).whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const credentials: InstagramCredentials = { token: input.token, ...account.value, savedAt: deps.now().toISOString() };
    const saved = await deps.store.update((current) => withInstagramCredentials(current, input.profile, credentials));
    if (!saved.ok) return err({ step: 'save', cause: saved.error.kind, message: saved.error.message });
    return ok({ platform: 'instagram', profile: input.profile, ...account.value });
  };
