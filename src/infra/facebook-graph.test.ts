import { afterEach, describe, expect, it } from 'bun:test';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import { err, ok } from '../domain/result.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import type { FacebookError } from '../use-cases/ports/facebook.ts';
import { createFacebookGraph } from './facebook-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'user', 'token'].join('-');
const BAKERY_TOKEN = ['bakery', 'page', 'token'].join('-');
const BOOKS_TOKEN = ['books', 'page', 'token'].join('-');
const ACCOUNTS_URL = 'https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token,tasks&limit=100';
const ME_URL = 'https://graph.facebook.com/v26.0/me?fields=id,name';

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

const accountsAnswer = (response: () => Response): FetchMock => installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === ACCOUNTS_URL, respond: response }]);

const meAnswer = (response: () => Response): FetchMock => installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === ME_URL, respond: response }]);

const abortReason = (signal: AbortSignal): Error => (signal.reason instanceof Error ? signal.reason : new Error('aborted'));

// A Graph API that never answers: the only way out is the adapter's own deadline.
const hangUntilAborted = async (init: RequestInit | undefined): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener('abort', () => {
      reject(abortReason(signal));
    });
  });

const metaError = (code: number, message: string, status = 400): Response => json({ error: { message, type: 'OAuthException', code, fbtrace_id: 'AbCdEf' } }, status);

describe('the Facebook Graph adapter', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('listing the Pages calls GET graph.facebook.com/v26.0/me/accounts with the token in the Authorization header, never in the URL, and reads each Page id, name, token and tasks', async () => {
    mock = accountsAnswer(() =>
      json({
        data: [
          { access_token: BAKERY_TOKEN, category: 'Bakery', name: 'Panda Bakery', id: '104000000000001', tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'] },
          { access_token: BOOKS_TOKEN, category: 'Bookstore', name: 'Panda Books', id: '104000000000002', tasks: ['ANALYZE', 'MODERATE'] },
        ],
        paging: { cursors: { before: 'QVFIUa', after: 'QVFIUb' } },
      })
    );

    const result = await createFacebookGraph({ token: TOKEN }).listPages();

    expect(result).toEqual(
      ok([
        { id: facebookPageIdUnsafe('104000000000001'), name: 'Panda Bakery', token: BAKERY_TOKEN, tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'] },
        { id: facebookPageIdUnsafe('104000000000002'), name: 'Panda Books', token: BOOKS_TOKEN, tasks: ['ANALYZE', 'MODERATE'] },
      ])
    );
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(mock.calls[0]?.url).not.toContain(TOKEN);
  });

  it('a Page listed without tasks reads as tasks unknown (null), and an entry without a numeric id or a token comes back as rejected', async () => {
    mock = accountsAnswer(() => json({ data: [{ access_token: BAKERY_TOKEN, name: 'Panda Bakery', id: '104000000000001' }] }));

    const untasked = await createFacebookGraph({ token: TOKEN }).listPages();

    expect(untasked).toEqual(ok([{ id: facebookPageIdUnsafe('104000000000001'), name: 'Panda Bakery', token: BAKERY_TOKEN, tasks: null }]));

    for (const entry of [
      { access_token: BAKERY_TOKEN, name: 'Panda Bakery', id: 'panda-bakery' },
      { name: 'Panda Bakery', id: '104000000000001' },
    ]) {
      mock.restore();
      mock = accountsAnswer(() => json({ data: [entry] }));

      const result = await createFacebookGraph({ token: TOKEN }).listPages();

      expect(!result.ok && result.error.kind).toBe('rejected');
    }
  });

  it('asking whose Page token it is calls GET /v26.0/me?fields=id,name and reads the Page id and name', async () => {
    mock = meAnswer(() => json({ id: '104000000000001', name: 'Panda Bakery' }));

    const result = await createFacebookGraph({ token: BAKERY_TOKEN }).whoAmI();

    expect(result).toEqual(ok({ id: facebookPageIdUnsafe('104000000000001'), name: 'Panda Bakery' }));
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${BAKERY_TOKEN}`);
  });

  it("Meta error code 190 comes back as unauthorized, codes 10 and 200 as forbidden, codes 4, 17, 32 and 613 as rate-limited, and anything else as rejected with its status, each with Meta's own message", async () => {
    const failures: ReadonlyArray<readonly [Response, FacebookError]> = [
      [
        json({ error: { message: 'Error validating access token: Session has expired.', type: 'OAuthException', code: 190, error_subcode: 463, fbtrace_id: 'AbCdEf' } }, 400),
        { kind: 'unauthorized', message: 'Error validating access token: Session has expired.' },
      ],
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
      mock = meAnswer(() => response);

      const result = await createFacebookGraph({ token: BAKERY_TOKEN }).whoAmI();

      expect(result).toEqual(err(expected));
    }
  });

  it('a call that runs past its deadline comes back as a timeout, and a failed connection as network-failed', async () => {
    mock = installFetchMock([{ match: (url) => url === ME_URL, respond: async (_url, init) => hangUntilAborted(init) }]);

    const late = await createFacebookGraph({ token: BAKERY_TOKEN, timeoutMs: 20 }).whoAmI();

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

    const unreachable = await createFacebookGraph({ token: BAKERY_TOKEN }).whoAmI();

    expect(unreachable).toEqual(err({ kind: 'network-failed', message: 'fetch failed' }));
  });
});
