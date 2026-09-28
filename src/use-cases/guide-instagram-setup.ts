import type { ProfileName } from '../domain/profile-name.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import type { ConnectInstagram, ConnectInstagramSummary } from './connect-instagram.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal } from './ports/terminal.ts';
import { guideCancelled, walkThenAskSecret } from './walk-setup-steps.ts';

export type GuideInstagramSetup = (input: { readonly profile: ProfileName }) => Promise<Result<ConnectInstagramSummary, StepError>>;

export type GuideInstagramSetupDeps = {
  readonly terminal: Terminal;
  readonly steps: ReadonlyArray<SetupStep>;
  readonly connectInstagram: ConnectInstagram;
};

const TOKEN_QUESTION = 'Paste your Instagram token (it stays hidden), then press Enter.';

// Every step waits for Enter, then the token is asked with the input hidden. Closing the input
// at any point stops the guide before anything is saved.
export const createGuideInstagramSetup =
  (deps: GuideInstagramSetupDeps): GuideInstagramSetup =>
  async (input) => {
    const token = await walkThenAskSecret(deps.terminal, deps.steps, TOKEN_QUESTION);
    if (!token.ok) return guideCancelled(token.error);
    return deps.connectInstagram({ profile: input.profile, token: token.value.trim() });
  };
