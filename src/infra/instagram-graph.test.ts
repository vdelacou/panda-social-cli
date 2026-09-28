import { afterEach, describe, expect, it } from 'bun:test';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { instagramMediaIdUnsafe } from '../domain/instagram-media-id.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock, FetchMockCall } from '../test-helpers/fetch-mock.ts';
import type { InstagramError } from '../use-cases/ports/instagram.ts';
import { createInstagramGraph } from './instagram-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'instagram', 'token'].join('-');
const NEW = ['new', 'instagram', 'token'].join('-');
const USER = '17841400000000001';
const ME_URL = 'https://graph.instagram.com/v26.0/me?fields=user_id,username';
const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token';
const LIMIT_URL = `https://graph.instagram.com/v26.0/${USER}/content_publishing_limit?fields=quota_usage,config`;

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

const answersAt = (target: string, response: () => Response): FetchMock =>
  installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === target, respond: response }]);

const abortReason = (signal: AbortSignal): Error => (signal.reason instanceof Error ? signal.reason : new Error('aborted'));

// An Instagram API that never answers: the only way out is the adapter's own deadline.
const hangUntilAborted = async (init: RequestInit | undefined): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener('abort', () => {
      reject(abortReason(signal));
    });
  });

const metaError = (code: number, message: string, status = 400): Response => json({ error: { message, type: 'OAuthException', code, fbtrace_id: 'AbCdEf' } }, status);

describe('the Instagram Graph adapter', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('asking whose token it is calls GET graph.instagram.com/v26.0/me?fields=user_id,username with the token in the Authorization header, never in the URL, and reads the professional account id from user_id rather than the app-scoped id, whether Meta answers flat or inside data', async () => {
    const account = { user_id: USER, username: 'panda', id: '26000000000000009' };

    for (const answer of [account, { data: [account] }]) {
      mock?.restore();
      mock = answersAt(ME_URL, () => json(answer));

      const result = await createInstagramGraph({ token: TOKEN }).whoAmI();

      expect(result).toEqual(ok({ userId: instagramUserIdUnsafe(USER), username: 'panda' }));
      expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
      expect(mock.calls[0]?.url).not.toContain(TOKEN);
    }
  });

  it('an account id that is not all digits, or an answer without a username, comes back as rejected', async () => {
    for (const answer of [{ user_id: '../17841400000000001', username: 'panda' }, { user_id: USER }]) {
      mock?.restore();
      mock = answersAt(ME_URL, () => json(answer));

      const result = await createInstagramGraph({ token: TOKEN }).whoAmI();

      expect(!result.ok && result.error.kind).toBe('rejected');
    }
  });

  it('refreshing sends GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token with the token in the header, never in the URL, and reads the new token and its lifetime; an answer without a new token comes back as rejected', async () => {
    mock = answersAt(REFRESH_URL, () => json({ access_token: NEW, token_type: 'bearer', expires_in: 5_184_000 }));

    const result = await createInstagramGraph({ token: TOKEN }).refreshToken();

    expect(result).toEqual(ok({ token: NEW, expiresInSeconds: 5_184_000 }));
    expect(mock.calls.map((call) => call.url)).toEqual([REFRESH_URL]);
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);

    mock.restore();
    mock = answersAt(REFRESH_URL, () => json({ token_type: 'bearer', expires_in: 5_184_000 }));

    const tokenless = await createInstagramGraph({ token: TOKEN }).refreshToken();

    expect(!tokenless.ok && tokenless.error.kind).toBe('rejected');
  });

  it('the posts quota is read from GET /v26.0/<account id>/content_publishing_limit?fields=quota_usage,config as used, total and window; an answer without them comes back as rejected', async () => {
    // Meta's documented answer (the content_publishing_limit reference, checked 2026-09-28).
    mock = answersAt(LIMIT_URL, () => json({ data: [{ quota_usage: 2, config: { quota_total: 50, quota_duration: 86_400 } }] }));

    const result = await createInstagramGraph({ token: TOKEN }).publishingLimit(instagramUserIdUnsafe(USER));

    expect(result).toEqual(ok({ used: 2, total: 50, windowSeconds: 86_400 }));

    mock.restore();
    mock = answersAt(LIMIT_URL, () => json({ data: [{ quota_usage: 2 }] }));

    const partial = await createInstagramGraph({ token: TOKEN }).publishingLimit(instagramUserIdUnsafe(USER));

    expect(!partial.ok && partial.error.kind).toBe('rejected');
  });

  it("Meta error code 190 comes back as unauthorized, codes 10 and 200 as forbidden, codes 4, 17, 32 and 613 as rate-limited, and anything else as rejected with its status, each with Meta's own message", async () => {
    const failures: ReadonlyArray<readonly [Response, InstagramError]> = [
      [metaError(190, 'Invalid OAuth access token - Cannot parse access token'), { kind: 'unauthorized', message: 'Invalid OAuth access token - Cannot parse access token' }],
      [metaError(10, '(#10) Application does not have permission for this action'), { kind: 'forbidden', message: '(#10) Application does not have permission for this action' }],
      [metaError(200, '(#200) Permissions error', 403), { kind: 'forbidden', message: '(#200) Permissions error' }],
      [metaError(4, '(#4) Application request limit reached'), { kind: 'rate-limited', message: '(#4) Application request limit reached' }],
      [metaError(17, '(#17) User request limit reached'), { kind: 'rate-limited', message: '(#17) User request limit reached' }],
      [metaError(32, '(#32) Page request limit reached'), { kind: 'rate-limited', message: '(#32) Page request limit reached' }],
      [metaError(613, '(#613) Calls to this api have exceeded the rate limit.'), { kind: 'rate-limited', message: '(#613) Calls to this api have exceeded the rate limit.' }],
      [
        metaError(2, 'An unexpected error has occurred. Please retry your request later.', 500),
        { kind: 'rejected', status: 500, message: 'An unexpected error has occurred. Please retry your request later.' },
      ],
      [new Response('Bad Gateway', { status: 502 }), { kind: 'rejected', status: 502, message: 'Bad Gateway' }],
    ];

    for (const [response, expected] of failures) {
      mock?.restore();
      mock = answersAt(ME_URL, () => response);

      const result = await createInstagramGraph({ token: TOKEN }).whoAmI();

      expect(result).toEqual(err(expected));
    }
  });

  it('a call that runs past its deadline comes back as a timeout, and a failed connection as network-failed', async () => {
    mock = installFetchMock([{ match: (url) => url === ME_URL, respond: async (_url, init) => hangUntilAborted(init) }]);

    const late = await createInstagramGraph({ token: TOKEN, timeoutMs: 20 }).whoAmI();

    expect(!late.ok && late.error.kind).toBe('timeout');

    mock.restore();
    mock = installFetchMock([
      {
        match: (url) => url === ME_URL,
        respond: () => {
          throw new TypeError('fetch failed');
        },
      },
    ]);

    const unreachable = await createInstagramGraph({ token: TOKEN }).whoAmI();

    expect(unreachable).toEqual(err({ kind: 'network-failed', message: 'fetch failed' }));
  });
});

const USER_ID = instagramUserIdUnsafe(USER);
const CONTAINER = '18000000000000001';
const MEDIA = '17900000000000001';
const IMAGE = 'https://cdn.example.com/cat.jpg';
const LINK = 'https://www.instagram.com/p/C0ffee/';
const MEDIA_URL = `https://graph.instagram.com/v26.0/${USER}/media`;
const STATUS_URL = `https://graph.instagram.com/v26.0/${CONTAINER}?fields=status_code,status`;
const PUBLISH_URL = `https://graph.instagram.com/v26.0/${USER}/media_publish`;
const PERMALINK_URL = `https://graph.instagram.com/v26.0/${MEDIA}?fields=permalink`;

// Each call gets the next answer; the last one repeats.
const inSequence = (answers: ReadonlyArray<() => Response>): (() => Response) => {
  let calls = 0;
  return () => {
    const answer = answers[Math.min(calls, answers.length - 1)] ?? (() => json({}, 500));
    calls += 1;
    return answer();
  };
};

// An Instagram that takes a container, reports its statuses in turn, publishes it and answers its permalink.
const containerFlow = (
  statuses: ReadonlyArray<() => Response>,
  published = (): Response => json({ id: MEDIA }),
  permalink = (): Response => json({ id: MEDIA, permalink: LINK })
): FetchMock =>
  installFetchMock([
    { match: (url, init) => init?.method === 'POST' && url === MEDIA_URL, respond: () => json({ id: CONTAINER }) },
    { match: (url, init) => init?.method === 'GET' && url === STATUS_URL, respond: inSequence(statuses) },
    { match: (url, init) => init?.method === 'POST' && url === PUBLISH_URL, respond: published },
    { match: (url, init) => init?.method === 'GET' && url === PERMALINK_URL, respond: permalink },
  ]);

const finished = (): Response => json({ status_code: 'FINISHED', id: CONTAINER });

const recordingSleep = (waits: number[]): ((ms: number) => Promise<void>) => {
  return async (ms) => {
    waits.push(ms);
    await Promise.resolve();
  };
};

// The fields of a form body, as Meta reads them.
const formOf = (call: FetchMockCall | undefined): Readonly<Record<string, string>> => Object.fromEntries(new URLSearchParams(String(call?.init?.body)));

describe('the Instagram Graph adapter, publishing', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('publishing an image creates a container with image_url and caption, checks its status_code until FINISHED, publishes it with creation_id and reads the permalink, every call with the token in the header', async () => {
    const waits: number[] = [];
    mock = containerFlow([() => json({ status_code: 'IN_PROGRESS', id: CONTAINER }), finished]);

    const result = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep(waits) }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), 'A cat on the sofa');

    expect(result).toEqual(ok({ id: instagramMediaIdUnsafe(MEDIA), url: LINK }));
    expect(mock.calls.map((call) => [call.init?.method, call.url])).toEqual([
      ['POST', MEDIA_URL],
      ['GET', STATUS_URL],
      ['GET', STATUS_URL],
      ['POST', PUBLISH_URL],
      ['GET', PERMALINK_URL],
    ]);
    expect(formOf(mock.calls[0])).toEqual({ image_url: IMAGE, caption: 'A cat on the sofa' });
    expect(formOf(mock.calls[3])).toEqual({ creation_id: CONTAINER });
    expect(mock.calls.every((call) => new Headers(call.init?.headers).get('authorization') === `Bearer ${TOKEN}`)).toBe(true);
    expect(waits).toEqual([500, 1500]);
  });

  it('an image without a caption gets a container with image_url alone', async () => {
    mock = containerFlow([finished]);

    const result = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), undefined);

    expect(result.ok).toBe(true);
    expect(formOf(mock.calls[0])).toEqual({ image_url: IMAGE });
  });

  it('a container that ends in ERROR comes back as image-rejected with its status, one that EXPIRED as rejected, and one still IN_PROGRESS after the last check as still-processing, with nothing published', async () => {
    const outcomes: ReadonlyArray<readonly [() => Response, InstagramError]> = [
      [() => json({ status_code: 'ERROR', status: '2207052', id: CONTAINER }), { kind: 'image-rejected', message: `container ${CONTAINER} ended in ERROR: 2207052` }],
      [() => json({ status_code: 'EXPIRED', id: CONTAINER }), { kind: 'rejected', status: 0, message: `container ${CONTAINER} ended in EXPIRED` }],
      [() => json({ status_code: 'IN_PROGRESS', id: CONTAINER }), { kind: 'still-processing', message: `container ${CONTAINER} was still processing after 3 checks` }],
    ];

    for (const [status, expected] of outcomes) {
      mock?.restore();
      mock = containerFlow([status]);

      const result = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep([]), pollAttempts: 3 }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), undefined);

      expect(result).toEqual(err(expected));
      expect(mock.calls.some((call) => call.url === PUBLISH_URL)).toBe(false);
    }
  });

  it('a published media whose permalink cannot be read still answers its id, with a null url, and a media id that is not all digits comes back as rejected', async () => {
    mock = containerFlow([finished], undefined, () => metaError(100, 'Unsupported get request.'));

    const linkless = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), undefined);

    expect(linkless).toEqual(ok({ id: instagramMediaIdUnsafe(MEDIA), url: null }));

    mock.restore();
    mock = containerFlow([finished], () => json({ id: '../17900000000000001' }));

    const odd = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), undefined);

    expect(!odd.ok && odd.error.kind).toBe('rejected');
  });

  it("Meta codes 9004, 36000, 36001 and 36003 come back as image-rejected, 9 as rate-limited and 9007 as still-processing, each with Meta's own message", async () => {
    const failures: ReadonlyArray<readonly [number, string, Exclude<InstagramError['kind'], 'rejected'>]> = [
      [9004, 'The media could not be fetched from this uri: https://cdn.example.com/cat.jpg', 'image-rejected'],
      [36_000, 'The image is too large to download. It should be less than 8 MB.', 'image-rejected'],
      [36_001, 'The image format is not supported.', 'image-rejected'],
      [36_003, 'The submitted image with aspect ratio 3:1 cannot be published.', 'image-rejected'],
      [9, 'You reached maximum number of posts that is allowed to be published', 'rate-limited'],
      [9007, 'The media is not ready for publishing, please wait for a moment', 'still-processing'],
    ];

    for (const [code, message, kind] of failures) {
      mock?.restore();
      mock = installFetchMock([{ match: (url) => url === MEDIA_URL, respond: () => metaError(code, message) }]);

      const result = await createInstagramGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(USER_ID, imageUrlUnsafe(IMAGE), undefined);

      expect(result).toEqual(err({ kind, message }));
    }
  });
});
