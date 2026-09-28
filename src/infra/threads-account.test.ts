import { afterEach, describe, expect, it } from 'bun:test';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import { createThreadsGraph } from './threads-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'threads', 'token'].join('-');
const NEW = ['new', 'threads', 'token'].join('-');
const USER = '26000000000000001';
const REFRESH_URL = 'https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token';
const LIMIT_URL = `https://graph.threads.net/v1.0/${USER}/threads_publishing_limit?fields=quota_usage,config,reply_quota_usage,reply_config,delete_quota_usage,delete_config`;

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

const quota = (total: number): { readonly quota_total: number; readonly quota_duration: number } => ({ quota_total: total, quota_duration: 86_400 });

describe('the Threads account calls', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('refreshing sends GET refresh_access_token with grant_type th_refresh_token and the token in the header, never in the URL', async () => {
    mock = installFetchMock([
      { match: (url, init) => init?.method === 'GET' && url === REFRESH_URL, respond: () => json({ access_token: NEW, token_type: 'bearer', expires_in: 5_184_000 }) },
    ]);

    const result = await createThreadsGraph({ token: TOKEN }).refreshToken();

    expect(result).toEqual({ ok: true, value: { token: NEW, expiresInSeconds: 5_184_000 } });
    expect(mock.calls.map((call) => call.url)).toEqual([REFRESH_URL]);
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('a refresh answer without a new token comes back as rejected', async () => {
    mock = installFetchMock([{ match: (url) => url === REFRESH_URL, respond: () => json({ token_type: 'bearer', expires_in: 5_184_000 }) }]);

    const result = await createThreadsGraph({ token: TOKEN }).refreshToken();

    expect(!result.ok && result.error.kind).toBe('rejected');
  });

  it('the publishing limit is read from GET /{user id}/threads_publishing_limit and comes back as posts, replies and deletes, each used, total and window', async () => {
    // Meta's documented answer (developers.facebook.com/docs/threads/troubleshooting, checked 2026-09-28), with some usage.
    const answer = {
      data: [{ quota_usage: 3, config: quota(250), reply_quota_usage: 10, reply_config: quota(1000), delete_quota_usage: 1, delete_config: quota(100) }],
    };
    mock = installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === LIMIT_URL, respond: () => json(answer) }]);

    const result = await createThreadsGraph({ token: TOKEN }).publishingLimits(threadsUserIdUnsafe(USER));

    expect(result).toEqual({
      ok: true,
      value: {
        posts: { used: 3, total: 250, windowSeconds: 86_400 },
        replies: { used: 10, total: 1000, windowSeconds: 86_400 },
        deletes: { used: 1, total: 100, windowSeconds: 86_400 },
      },
    });
  });

  it('a publishing-limit answer without all three quotas comes back as rejected', async () => {
    mock = installFetchMock([{ match: (url) => url === LIMIT_URL, respond: () => json({ data: [{ quota_usage: 3, config: quota(250) }] }) }]);

    const result = await createThreadsGraph({ token: TOKEN }).publishingLimits(threadsUserIdUnsafe(USER));

    expect(!result.ok && result.error.kind).toBe('rejected');
  });

  it('an id from /me that is not all digits comes back as rejected, so it never reaches a URL', async () => {
    mock = installFetchMock([{ match: (url) => url.endsWith('/v1.0/me?fields=id,username'), respond: () => json({ id: '../26000000000000001', username: 'panda' }) }]);

    const result = await createThreadsGraph({ token: TOKEN }).whoAmI();

    expect(!result.ok && result.error.kind).toBe('rejected');
  });
});
