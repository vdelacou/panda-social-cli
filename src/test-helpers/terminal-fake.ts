import type { SetupStep, StepPosition } from '../domain/setup-step.ts';
import { err, ok } from '../domain/result.ts';
import type { Terminal } from '../use-cases/ports/terminal.ts';

export type TerminalEvent =
  { readonly kind: 'step'; readonly title: string; readonly position: StepPosition } | { readonly kind: 'ask'; readonly question: string; readonly hidden: boolean };

export type TerminalFake = Terminal & {
  readonly events: ReadonlyArray<TerminalEvent>;
};

// Answers questions in order from `answers`; once they run out, the input is closed
// and every further question comes back cancelled, as a real terminal at end of input.
export const createTerminalFake = (answers: ReadonlyArray<string>): TerminalFake => {
  const events: TerminalEvent[] = [];
  const remaining = [...answers];
  return {
    events,
    showStep: (step: SetupStep, position: StepPosition) => {
      events.push({ kind: 'step', title: step.title, position });
    },
    ask: async (question, options) => {
      events.push({ kind: 'ask', question, hidden: options.hidden });
      const answer = remaining.shift();
      if (answer === undefined) return err({ kind: 'cancelled', message: 'the input closed' });
      return ok(answer);
    },
  };
};
