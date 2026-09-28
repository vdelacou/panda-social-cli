import type { Result } from '../domain/result.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { CliIo } from './cli-io.ts';
import type { Config } from './env.ts';
import { facebookOutcome } from './run-facebook.ts';
import type { FacebookCommand } from './run-facebook.ts';
import { instagramOutcome } from './run-instagram.ts';
import type { InstagramCommand } from './run-instagram.ts';
import { threadsOutcome } from './run-threads.ts';
import type { ThreadsCommand } from './run-threads.ts';
import { xOutcome } from './run-x.ts';
import type { XCommand } from './run-x.ts';

// Every command that acts on one account.
export type AccountCommand = ThreadsCommand | XCommand | FacebookCommand | InstagramCommand;

// What one command on one account answers, by platform, before anything is printed: a
// cross-post collects these (D39).
export const accountOutcome = async (io: CliIo, command: AccountCommand, config: Config): Promise<Result<unknown, StepError>> => {
  if (command.platform === 'x') return xOutcome(io, command, config);
  if (command.platform === 'facebook') return facebookOutcome(io, command, config);
  if (command.platform === 'instagram') return instagramOutcome(io, command, config);
  return threadsOutcome(io, command, config);
};
