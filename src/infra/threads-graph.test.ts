import { afterEach, describe, expect, it } from 'bun:test';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock, FetchMockCall } from '../test-helpers/fetch-mock.ts';
import { createThreadsGraph } from './threads-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'threads', 'token'].join('-');
const POST_ID = '17890000000000001';
const PERMALINK = 'https://www.threads.com/@panda/post/C0ffee';

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

const isPublish = (url: string, init: RequestInit | undefined): boolean => init?.method === 'POST' && url.endsWith('/v1.0/me/threads');

const publishAnswers = (response: () => Response): FetchMock =>
  installFetchMock([
    { match: isPublish, respond: response },
    { match: (url) => url.includes(`/v1.0/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
  ]);

const sentForm = (call: FetchMockCall | undefined): Record<string, string> => {
  const body = String(call?.init?.body);
  return Object.fromEntries(new URLSearchParams(body));
};

const abortReason = (signal: AbortSignal): Error => (signal.reason instanceof Error ? signal.reason : new Error('aborted'));

// A Threads that never answers: the only way out is the adapter's own deadline.
const hangUntilAborted = async (init: RequestInit | undefined): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener('abort', () => {
      reject(abortReason(signal));
    });
  });

describe('the Threads Graph adapter', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('posting text sends one auto-published TEXT call with the token in the Authorization header and never in the URL, then reads back the permalink', async () => {
    mock = publishAnswers(() => json({ id: POST_ID }));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(result).toEqual({ ok: true, value: { id: POST_ID, url: PERMALINK } });
    const [publish] = mock.calls;
    expect(sentForm(publish)).toEqual({ media_type: 'TEXT', text: 'Hello from panda', auto_publish_text: 'true' });
    expect(new Headers(publish?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(mock.calls.some((call) => call.url.includes(TOKEN))).toBe(false);
  });

  it('an expired token (HTTP 400, OAuth code 190) comes back as unauthorized', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Error validating access token: Session has expired', type: 'OAuthException', code: 190 } }, 400));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('unauthorized');
  });

  it('a 429 from Threads comes back as rate-limited', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Application request limit reached', code: 4 } }, 429));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('rate-limited');
  });

  it('a 5xx from Threads comes back as rejected, with its HTTP status', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Service temporarily unavailable', code: 2 } }, 503));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error).toEqual({ kind: 'rejected', status: 503, message: expect.stringContaining('Service temporarily unavailable') });
  });

  it('a call that runs past its deadline comes back as a timeout', async () => {
    mock = installFetchMock([{ match: isPublish, respond: async (_url, init) => hangUntilAborted(init) }]);

    const result = await createThreadsGraph({ token: TOKEN, timeoutMs: 20 }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('timeout');
  });
});
