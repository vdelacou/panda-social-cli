import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { StepError } from './ports/step-error.ts';

// One platform the post goes to; the rest of what it carries is the platform's own business.
export type CrossPostTarget = { readonly platform: string };

// A platform that failed, with the code, the message and the details it failed with.
export type PlatformFailure = {
  readonly platform: string;
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

export type CrossPostSummary = { readonly posts: ReadonlyArray<unknown> };

export type CrossPostError = StepError & {
  readonly details: { readonly published: ReadonlyArray<unknown>; readonly failed: ReadonlyArray<PlatformFailure> };
};

export type CrossPost<T extends CrossPostTarget> = (targets: ReadonlyArray<T>) => Promise<Result<CrossPostSummary, CrossPostError>>;

export type CrossPostDeps<T extends CrossPostTarget> = {
  // Posts to one platform and answers as that platform alone would.
  readonly post: (target: T) => Promise<Result<unknown, StepError>>;
};

type Outcome = { readonly platform: string; readonly result: Result<unknown, StepError> };

// D39: one platform after another, in the order given, so two token renewals never write the
// credentials file at once; a failure never stops the next platform.
const postInTurn = async <T extends CrossPostTarget>(deps: CrossPostDeps<T>, targets: ReadonlyArray<T>): Promise<ReadonlyArray<Outcome>> => {
  const outcomes: Outcome[] = [];
  for (const target of targets) outcomes.push({ platform: target.platform, result: await deps.post(target) });
  return outcomes;
};

const failureOf = (platform: string, error: StepError): PlatformFailure => ({
  platform,
  code: error.cause,
  message: error.message,
  ...(error.details && { details: error.details }),
});

// D40: every post, or what exists and what failed, so an agent retries only the failures.
const summed = (outcomes: ReadonlyArray<Outcome>): Result<CrossPostSummary, CrossPostError> => {
  const posted = outcomes.flatMap((outcome) => (outcome.result.ok ? [{ platform: outcome.platform, post: outcome.result.value }] : []));
  const failed = outcomes.flatMap((outcome) => (outcome.result.ok ? [] : [failureOf(outcome.platform, outcome.result.error)]));
  const published = posted.map((entry) => entry.post);
  if (failed.length === 0) return ok({ posts: published });
  const failures = `failed on ${failed.map((failure) => failure.platform).join(', ')}.`;
  const message = posted.length === 0 ? `Nothing was posted; ${failures}` : `Posted on ${posted.map((entry) => entry.platform).join(', ')}; ${failures}`;
  return err({ step: 'post', cause: posted.length === 0 ? 'not-published' : 'partly-published', message, details: { published, failed } });
};

export const createCrossPost =
  <T extends CrossPostTarget>(deps: CrossPostDeps<T>): CrossPost<T> =>
  async (targets) =>
    summed(await postInTurn(deps, targets));
