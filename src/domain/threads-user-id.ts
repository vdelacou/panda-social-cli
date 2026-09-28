import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// The id Threads gives an account goes into a URL path (the publishing limit), so only
// digits get through (rule 12).
export type ThreadsUserId = string & { readonly __brand: 'ThreadsUserId' };

export type ThreadsUserIdError = { readonly kind: 'invalid-user-id'; readonly message: string };

const DIGITS = /^\d+$/;

export const parseThreadsUserId = (raw: string): Result<ThreadsUserId, ThreadsUserIdError> => {
  if (!DIGITS.test(raw)) return err({ kind: 'invalid-user-id', message: `Not a Threads user id: "${raw}".` });
  return ok(raw as ThreadsUserId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const threadsUserIdUnsafe = (value: string): ThreadsUserId => value as ThreadsUserId;
