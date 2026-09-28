import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { SetupStep } from '../domain/setup-step.ts';
import type { StepError } from './ports/step-error.ts';
import type { Terminal, TerminalError } from './ports/terminal.ts';

const ENTER = 'Press Enter when this step is done.';

// Every guided setup shows its steps one at a time, each waiting for Enter.
export const walkSetupSteps = async (terminal: Terminal, steps: ReadonlyArray<SetupStep>): Promise<Result<void, TerminalError>> => {
  for (const [index, step] of steps.entries()) {
    terminal.showStep(step, { index: index + 1, total: steps.length });
    const done = await terminal.ask(ENTER, { hidden: false });
    if (!done.ok) return done;
  }
  return ok(undefined);
};

// The token guides (Threads, Facebook): every step, then the token with the input hidden.
export const walkThenAskSecret = async (terminal: Terminal, steps: ReadonlyArray<SetupStep>, question: string): Promise<Result<string, TerminalError>> => {
  const walked = await walkSetupSteps(terminal, steps);
  if (!walked.ok) return walked;
  return terminal.ask(question, { hidden: true });
};

// Closing the input at any point stops a guide before anything is saved.
export const guideCancelled = (error: TerminalError): Result<never, StepError> => err({ step: 'guide', cause: error.kind, message: error.message });
