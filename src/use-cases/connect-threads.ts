import { withThreadsCredentials } from '../domain/credentials.ts';
import type { ThreadsCredentials } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { StepError } from './ports/step-error.ts';
import type { Threads, ThreadsAccount } from './ports/threads.ts';

export type ConnectThreadsInput = {
  readonly profile: ProfileName;
  readonly token: string;
};

export type ConnectThreadsSummary = ThreadsAccount & {
  readonly platform: 'threads';
  readonly profile: ProfileName;
};

export type ConnectThreads = (input: ConnectThreadsInput) => Promise<Result<ConnectThreadsSummary, StepError>>;

export type ConnectThreadsDeps = {
  readonly threadsFor: (token: string) => Threads;
  readonly store: CredentialStore;
  readonly now: () => Date;
};

// A token is saved only after Threads confirms whose it is, so a stored token always
// names a real account and a typo never shadows a working one.
export const createConnectThreads =
  (deps: ConnectThreadsDeps): ConnectThreads =>
  async (input) => {
    const account = await deps.threadsFor(input.token).whoAmI();
    if (!account.ok) return err({ step: 'verify', cause: account.error.kind, message: account.error.message });
    const credentials: ThreadsCredentials = { token: input.token, ...account.value, savedAt: deps.now().toISOString() };
    const saved = await deps.store.update((current) => withThreadsCredentials(current, input.profile, credentials));
    if (!saved.ok) return err({ step: 'save', cause: saved.error.kind, message: saved.error.message });
    return ok({ platform: 'threads', profile: input.profile, ...account.value });
  };
