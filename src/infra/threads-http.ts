import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsPostId } from '../domain/threads-post-id.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import { formatError } from '../domain/utilities/format-error.ts';
import type { ThreadsError } from '../use-cases/ports/threads.ts';

export const THREADS_GRAPH_HOST = 'https://graph.threads.net';
export const THREADS_GRAPH_BASE = `${THREADS_GRAPH_HOST}/v1.0`;

// Rule 29: every call carries a deadline. Publishing is not idempotent, so a
// timed-out publish is reported, never retried: it may have gone out anyway.
const DEFAULT_TIMEOUT_MS = 10_000;

export type ThreadsGraphConfig = {
  readonly token: string;
  readonly timeoutMs?: number;
  // The wait between container status checks; tests pass one that returns at once.
  readonly sleep?: (ms: number) => Promise<void>;
  readonly pollAttempts?: number;
};

// An expired or revoked Threads token answers 400 with OAuthException code 190, not 401.
const OAUTH_TOKEN_ERROR = /"code":\s*190\b/;
// Code 10: the token lacks a permission the call needs (threads_delete, threads_manage_replies).
const MISSING_PERMISSION = /"code":\s*10\b/;
// Subcode 2207052: Meta could not download the image at the URL it was given.
const IMAGE_FETCH_FAILED = /"error_subcode":\s*2207052\b/;

const classifyHttp = (status: number, body: string): ThreadsError => {
  if (MISSING_PERMISSION.test(body)) return { kind: 'forbidden', message: body };
  if (status === 401 || status === 403 || OAUTH_TOKEN_ERROR.test(body)) return { kind: 'unauthorized', message: body };
  if (status === 429) return { kind: 'rate-limited', message: body };
  if (IMAGE_FETCH_FAILED.test(body)) return { kind: 'image-rejected', message: body };
  return { kind: 'rejected', status, message: body };
};

const isTimeout = (error: unknown): boolean => error instanceof DOMException && error.name === 'TimeoutError';

const classifyThrown = (error: unknown): ThreadsError => {
  if (isTimeout(error)) return { kind: 'timeout', message: formatError(error) };
  return { kind: 'network-failed', message: formatError(error) };
};

// `path` sits under the versioned base; the token refresh alone lives at the host root.
export const request = async (
  config: ThreadsGraphConfig,
  path: string,
  init: RequestInit,
  base: string = THREADS_GRAPH_BASE
): Promise<Result<Readonly<Record<string, unknown>>, ThreadsError>> => {
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const body = await response.text();
    if (!response.ok) return err(classifyHttp(response.status, body));
    return ok(JSON.parse(body) as Readonly<Record<string, unknown>>);
  } catch (error) {
    return err(classifyThrown(error));
  }
};

export const stringField = (body: Readonly<Record<string, unknown>>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === 'string' ? value : undefined;
};

// Ids Threads hands back go into the next URL path, so they are checked here (rule 12).
export const idFrom = (body: Readonly<Record<string, unknown>>): Result<ThreadsPostId, ThreadsError> => {
  const raw = stringField(body, 'id');
  const id = parseThreadsPostId(raw ?? '');
  return id.ok ? id : err({ kind: 'rejected', status: 200, message: `unexpected post id from Threads: ${String(raw)}` });
};
