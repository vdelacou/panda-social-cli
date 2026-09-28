import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A post id goes into a Threads URL path, so only digits get through (rule 12).
export type ThreadsPostId = string & { readonly __brand: 'ThreadsPostId' };

export type ThreadsPostIdError = { readonly kind: 'invalid-post-id'; readonly message: string };

const DIGITS = /^\d+$/;

const refusal = (raw: string): string => `Not a Threads post id: "${raw}".`;

// For outside input: a user's --id, a library caller's argument.
export const parseThreadsPostId = (raw: string): Result<ThreadsPostId, ThreadsPostIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-post-id', message: refusal(raw) });
  return ok(raw as ThreadsPostId);
};

// For an id already proven, such as one the Threads adapter checked: a failure is a bug.
export const threadsPostId = (value: string): ThreadsPostId => {
  if (!DIGITS.test(value)) throw new Error(refusal(value));
  return value as ThreadsPostId;
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const threadsPostIdUnsafe = (value: string): ThreadsPostId => value as ThreadsPostId;
