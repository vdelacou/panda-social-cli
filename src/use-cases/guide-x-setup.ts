import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import { parseXKeys, X_KEY_NAMES } from '../domain/x-keys.ts';
import type { ConnectX, ConnectXSummary } from './connect-x.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal, TerminalError } from './ports/terminal.ts';

export type GuideXSetup = (input: { readonly profile: ProfileName }) => Promise<Result<ConnectXSummary, StepError>>;

export type GuideXSetupDeps = {
  readonly terminal: Terminal;
  readonly steps: ReadonlyArray<SetupStep>;
  readonly connectX: ConnectX;
};

const ENTER = 'Press Enter when this step is done.';

const cancelled = (error: TerminalError): Result<never, StepError> => err({ step: 'guide', cause: error.kind, message: error.message });

const walk = async (deps: GuideXSetupDeps): Promise<Result<void, TerminalError>> => {
  for (const [index, step] of deps.steps.entries()) {
    deps.terminal.showStep(step, { index: index + 1, total: deps.steps.length });
    const done = await deps.terminal.ask(ENTER, { hidden: false });
    if (!done.ok) return done;
  }
  return ok(undefined);
};

// One hidden question per key, in the order the console shows them.
const askKeys = async (terminal: Terminal): Promise<Result<ReadonlyArray<string>, TerminalError>> => {
  const answers: string[] = [];
  for (const name of X_KEY_NAMES) {
    const answer = await terminal.ask(`Paste the ${name} (it stays hidden), then press Enter.`, { hidden: true });
    if (!answer.ok) return answer;
    answers.push(answer.value);
  }
  return ok(answers);
};

// Every step waits for Enter, then the four keys are asked with the input hidden. Closing
// the input at any point stops the guide before anything is saved.
export const createGuideXSetup =
  (deps: GuideXSetupDeps): GuideXSetup =>
  async (input) => {
    const walked = await walk(deps);
    if (!walked.ok) return cancelled(walked.error);
    const answers = await askKeys(deps.terminal);
    if (!answers.ok) return cancelled(answers.error);
    const keys = parseXKeys(answers.value);
    if (!keys.ok) return err({ step: 'guide', cause: keys.error.kind, message: keys.error.message });
    return deps.connectX({ profile: input.profile, keys: keys.value });
  };
