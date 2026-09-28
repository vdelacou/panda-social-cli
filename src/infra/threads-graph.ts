import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { formatError } from '../domain/utilities/format-error.ts';
import type { PublishedPost, Threads, ThreadsAccount, ThreadsError } from '../use-cases/ports/threads.ts';

export const THREADS_GRAPH_BASE = 'https://graph.threads.net/v1.0';

// Rule 29: every call carries a deadline. Publishing is not idempotent, so a
// timed-out publish is reported, never retried: it may have gone out anyway.
const DEFAULT_TIMEOUT_MS = 10_000;

export type ThreadsGraphConfig = {
  readonly token: string;
  readonly timeoutMs?: number;
};

// An expired or revoked Threads token answers 400 with OAuthException code 190, not 401.
const OAUTH_TOKEN_ERROR = /"code":\s*190\b/;

// The post id comes back from Threads and goes into the next URL path, so it is
// checked before it reaches that sink (rule 12). The ThreadsPostId brand arrives
// with `delete`, where the same check guards user input.
const NUMERIC_ID = /^\d+$/;

const classifyHttp = (status: number, body: string): ThreadsError => {
  if (status === 401 || status === 403 || OAUTH_TOKEN_ERROR.test(body)) return { kind: 'unauthorized', message: body };
  if (status === 429) return { kind: 'rate-limited', message: body };
  return { kind: 'rejected', status, message: body };
};

const isTimeout = (error: unknown): boolean => error instanceof DOMException && error.name === 'TimeoutError';

const classifyThrown = (error: unknown): ThreadsError => {
  if (isTimeout(error)) return { kind: 'timeout', message: formatError(error) };
  return { kind: 'network-failed', message: formatError(error) };
};

const request = async (config: ThreadsGraphConfig, path: string, init: RequestInit): Promise<Result<Readonly<Record<string, unknown>>, ThreadsError>> => {
  try {
    const response = await fetch(`${THREADS_GRAPH_BASE}${path}`, {
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

const stringField = (body: Readonly<Record<string, unknown>>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === 'string' ? value : undefined;
};

// The post already exists at this point: a failed permalink read is reported as
// a null url, never as a failure an agent would answer with a duplicate post.
const readPermalink = async (config: ThreadsGraphConfig, id: string): Promise<string | null> => {
  const answer = await request(config, `/${id}?fields=permalink`, { method: 'GET' });
  if (!answer.ok) return null;
  return stringField(answer.value, 'permalink') ?? null;
};

const publishText = async (config: ThreadsGraphConfig, text: string): Promise<Result<PublishedPost, ThreadsError>> => {
  const body = new URLSearchParams({ media_type: 'TEXT', text, auto_publish_text: 'true' });
  const created = await request(config, '/me/threads', { method: 'POST', body });
  if (!created.ok) return created;
  const id = stringField(created.value, 'id');
  if (id === undefined || !NUMERIC_ID.test(id)) return err({ kind: 'rejected', status: 200, message: `unexpected post id from Threads: ${String(id)}` });
  return ok({ id, url: await readPermalink(config, id) });
};

const whoAmI = async (config: ThreadsGraphConfig): Promise<Result<ThreadsAccount, ThreadsError>> => {
  const answer = await request(config, '/me?fields=id,username', { method: 'GET' });
  if (!answer.ok) return answer;
  const userId = stringField(answer.value, 'id');
  const username = stringField(answer.value, 'username');
  if (userId === undefined || username === undefined) return err({ kind: 'rejected', status: 200, message: 'Threads answered /me without an id or a username' });
  return ok({ userId, username });
};

export const createThreadsGraph = (config: ThreadsGraphConfig): Threads => ({
  publishText: async (text) => publishText(config, text),
  whoAmI: async () => whoAmI(config),
});
