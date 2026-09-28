import type { ProfileName } from '../domain/profile-name.ts';
import { err } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import type { ConnectThreads, ConnectThreadsSummary } from './connect-threads.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal, TerminalError } from './ports/terminal.ts';

export type GuideThreadsSetup = (input: { readonly profile: ProfileName }) => Promise<Result<ConnectThreadsSummary, StepError>>;

export type GuideThreadsSetupDeps = {
  readonly terminal: Terminal;
  readonly steps: ReadonlyArray<SetupStep>;
  readonly connectThreads: ConnectThreads;
};

const ENTER = 'Press Enter when this step is done.';
const TOKEN_QUESTION = 'Paste your Threads token (it stays hidden), then press Enter.';

const cancelled = (error: TerminalError): Result<never, StepError> => err({ step: 'guide', cause: error.kind, message: error.message });

// Every step waits for Enter, then the token is asked with the input hidden. Closing
// the input at any point stops the guide before anything is saved.
export const createGuideThreadsSetup =
  (deps: GuideThreadsSetupDeps): GuideThreadsSetup =>
  async (input) => {
    for (const [index, step] of deps.steps.entries()) {
      deps.terminal.showStep(step, { index: index + 1, total: deps.steps.length });
      const done = await deps.terminal.ask(ENTER, { hidden: false });
      if (!done.ok) return cancelled(done.error);
    }
    const token = await deps.terminal.ask(TOKEN_QUESTION, { hidden: true });
    if (!token.ok) return cancelled(token.error);
    return deps.connectThreads({ profile: input.profile, token: token.value.trim() });
  };
