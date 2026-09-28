import type { Result } from '../../domain/result.ts';
import type { SetupStep, StepPosition } from '../../domain/setup-step.ts';

export type TerminalError = { readonly kind: 'cancelled'; readonly message: string };

export type Terminal = {
  readonly showStep: (step: SetupStep, position: StepPosition) => void;
  readonly ask: (question: string, options: { readonly hidden: boolean }) => Promise<Result<string, TerminalError>>;
};
