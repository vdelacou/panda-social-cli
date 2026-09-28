import { withXCredentials } from '../domain/credentials.ts';
import type { XCredentials } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XKeys } from '../domain/x-keys.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { StepError } from './ports/step-error.ts';
import type { X } from './ports/x.ts';

export type ConnectXInput = {
  readonly profile: ProfileName;
  readonly keys: XKeys;
};

export type ConnectXSummary = {
  readonly platform: 'x';
  readonly profile: ProfileName;
  readonly userId: string;
  readonly username: string;
};

export type ConnectX = (input: ConnectXInput) => Promise<Result<ConnectXSummary, StepError>>;

export type ConnectXDeps = {
  readonly xFor: (keys: XKeys) => X;
  readonly store: CredentialStore;
  readonly now: () => Date;
};

// Keys are saved only after X confirms whose they are. Keys made before the app was set to
// Read and write stay read-only and would fail at the first post, so they are refused here
// when X reports their level; X does not always send one (null), and then the first post
// tells instead.
export const createConnectX =
  (deps: ConnectXDeps): ConnectX =>
  async (input) => {
    const account = await deps.xFor(input.keys).whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const { userId, username, accessLevel } = account.value;
    if (accessLevel === 'read') return err({ step: 'verify', cause: 'read-only-keys', message: `The keys of @${username} can read but not post.` });
    const credentials: XCredentials = { ...input.keys, userId, username, savedAt: deps.now().toISOString() };
    const saved = await deps.store.update((current) => withXCredentials(current, input.profile, credentials));
    if (!saved.ok) return err({ step: 'save', cause: saved.error.kind, message: saved.error.message });
    return ok({ platform: 'x', profile: input.profile, userId, username });
  };
