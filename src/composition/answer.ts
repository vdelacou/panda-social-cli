import type { Result } from '../domain/result.ts';
import { renderFailure, renderSuccess } from '../presenter/cli.ts';
import type { Failure } from '../presenter/cli.ts';
import { hintFor } from '../presenter/hints.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { CliIo } from './cli-io.ts';

// One JSON line per run, exit code 0 or 1: the whole output contract in three functions.
export const fail = (io: CliIo, failure: Failure): number => {
  io.writeOut(renderFailure(failure));
  return 1;
};

export const succeed = (io: CliIo, data: unknown): number => {
  io.writeOut(renderSuccess(data));
  return 0;
};

export const answer = (io: CliIo, result: Result<unknown, StepError>): number =>
  result.ok ? succeed(io, result.value) : fail(io, { code: result.error.cause, message: result.error.message, hint: hintFor(result.error.cause) });
