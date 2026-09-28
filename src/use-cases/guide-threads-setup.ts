import type { ProfileName } from '../domain/profile-name.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import type { ConnectThreads, ConnectThreadsSummary } from './connect-threads.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal } from './ports/terminal.ts';
import { guideCancelled, walkThenAskSecret } from './walk-setup-steps.ts';

export type GuideThreadsSetup = (input: { readonly profile: ProfileName }) => Promise<Result<ConnectThreadsSummary, StepError>>;

export type GuideThreadsSetupDeps = {
  readonly terminal: Terminal;
  readonly steps: ReadonlyArray<SetupStep>;
  readonly connectThreads: ConnectThreads;
};

const TOKEN_QUESTION = 'Paste your Threads token (it stays hidden), then press Enter.';

// Every step waits for Enter, then the token is asked with the input hidden. Closing
// the input at any point stops the guide before anything is saved.
export const createGuideThreadsSetup =
  (deps: GuideThreadsSetupDeps): GuideThreadsSetup =>
  async (input) => {
    const token = await walkThenAskSecret(deps.terminal, deps.steps, TOKEN_QUESTION);
    if (!token.ok) return guideCancelled(token.error);
    return deps.connectThreads({ profile: input.profile, token: token.value.trim() });
  };
