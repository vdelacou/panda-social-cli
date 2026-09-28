import { afterEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { XKeys } from '../domain/x-keys.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock, FetchMockCall } from '../test-helpers/fetch-mock.ts';
import type { XError } from '../use-cases/ports/x.ts';
import { createXApi } from './x-api.ts';

// Built at runtime so no secret-looking literal sits beside a key-shaped name.
const KEYS: XKeys = {
  apiKey: ['test', 'api', 'key'].join('-'),
  apiSecret: ['test', 'api', 'secret'].join('-'),
  accessToken: ['test', 'access', 'token'].join('-'),
  accessSecret: ['test', 'access', 'secret'].join('-'),
};
const ME_URL = 'https://api.x.com/2/users/me';
const TWEETS_URL = 'https://api.x.com/2/tweets';
const UPLOAD_URL = 'https://api.x.com/2/media/upload';
const POST_ID = '1880000000000000001';
const MEDIA_ID = '1890000000000000001';

const json = (body: unknown, status = 200, headers: Readonly<Record<string, string>> = {}): Response =>
  Response.json(body, { status, headers: { 'content-type': 'application/json', ...headers } });

const meAnswers = (response: () => Response): FetchMock => installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === ME_URL, respond: response }]);

const postAnswers = (response: () => Response): FetchMock => installFetchMock([{ match: (url, init) => init?.method === 'POST' && url === TWEETS_URL, respond: response }]);

const bodyOf = (call: FetchMockCall | undefined): unknown => JSON.parse(String(call?.init?.body));

// RFC 3986 percent-encoding, as OAuth 1.0a signs with it.
const percent = (value: string): string => encodeURIComponent(value).replaceAll(/[!'()*]/g, (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`);

// One `name="value"` pair of the header; the values are percent-encoded, so none holds a quote or a comma.
const parameterOf = (pair: string): readonly [string, string] => {
  const equals = pair.indexOf('=');
  return [pair.slice(0, equals), decodeURIComponent(pair.slice(equals + 2, -1))];
};

const oauthParameters = (header: string | null): Readonly<Record<string, string>> =>
  Object.fromEntries(
    (header ?? '')
      .replace(/^OAuth /, '')
      .split(', ')
      .map((pair) => parameterOf(pair))
  );

const byNameThenValue = (left: readonly [string, string], right: readonly [string, string]): number => `${left[0]}=${left[1]}`.localeCompare(`${right[0]}=${right[1]}`);

// RFC 5849 section 3.4, computed here without the adapter's library: the signature X expects.
const expectedSignature = (method: string, url: string, parameters: Readonly<Record<string, string>>): string => {
  const target = new URL(url);
  const signed = [...Object.entries(parameters).filter(([name]) => name !== 'oauth_signature'), ...target.searchParams]
    .map(([name, value]): readonly [string, string] => [percent(name), percent(value)])
    .toSorted(byNameThenValue);
  const base = [method, percent(`${target.origin}${target.pathname}`), percent(signed.map(([name, value]) => `${name}=${value}`).join('&'))].join('&');
  return createHmac('sha1', `${percent(KEYS.apiSecret)}&${percent(KEYS.accessSecret)}`)
    .update(base)
    .digest('base64');
};

const abortReason = (signal: AbortSignal): Error => (signal.reason instanceof Error ? signal.reason : new Error('aborted'));

// An X that never answers: the only way out is the adapter's own deadline.
const hangUntilAborted = async (init: RequestInit | undefined): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener('abort', () => {
      reject(abortReason(signal));
    });
  });

describe('the X API adapter', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('asking who the keys belong to calls GET api.x.com/2/users/me and reads the id, the username and the x-access-level header', async () => {
    mock = meAnswers(() => json({ data: { id: '1600000000000000001', name: 'Panda', username: 'panda' } }, 200, { 'x-access-level': 'read-write' }));

    const result = await createXApi({ keys: KEYS }).whoAmI();

    expect(result).toEqual({ ok: true, value: { userId: '1600000000000000001', username: 'panda', accessLevel: 'read-write' } });

    mock.restore();
    mock = meAnswers(() => json({ data: { id: '1600000000000000001', name: 'Panda', username: 'panda' } }));

    const without = await createXApi({ keys: KEYS }).whoAmI();

    expect(without.ok && without.value.accessLevel).toBeNull();
  });

  it('every X request carries an OAuth 1.0a signature that verifies against the four keys', async () => {
    mock = meAnswers(() => json({ data: { id: '1600000000000000001', username: 'panda' } }));

    await createXApi({ keys: KEYS }).whoAmI();

    const parameters = oauthParameters(new Headers(mock.calls[0]?.init?.headers).get('authorization'));
    expect(parameters).toEqual(
      expect.objectContaining({ oauth_consumer_key: KEYS.apiKey, oauth_token: KEYS.accessToken, oauth_signature_method: 'HMAC-SHA1', oauth_version: '1.0' })
    );
    expect(parameters['oauth_signature']).toBe(expectedSignature('GET', ME_URL, parameters));
  });

  it('a 401 comes back as unauthorized, a 402 as credits-depleted and a 429 as rate-limited', async () => {
    for (const [status, kind] of [
      [401, 'unauthorized'],
      [402, 'credits-depleted'],
      [429, 'rate-limited'],
    ] as const) {
      mock = meAnswers(() => json({ title: 'Refused', detail: 'refused', type: 'about:blank', status }, status));

      const result = await createXApi({ keys: KEYS }).whoAmI();

      expect(!result.ok && result.error.kind).toBe(kind);
      mock.restore();
    }
  });

  it('a 403 whose detail says the app lacks write permission comes back as read-only-keys; any other 403 as forbidden with X detail', async () => {
    const readOnly = 'Your client app is not configured with the appropriate oauth1 app permissions for this endpoint.';
    mock = meAnswers(() => json({ title: 'Forbidden', detail: readOnly, type: 'about:blank', status: 403 }, 403));

    const refused = await createXApi({ keys: KEYS }).whoAmI();

    expect(!refused.ok && refused.error.kind).toBe('read-only-keys');

    mock.restore();
    mock = meAnswers(() => json({ title: 'Forbidden', detail: 'You are not permitted to perform this action.', type: 'about:blank', status: 403 }, 403));

    const forbidden = await createXApi({ keys: KEYS }).whoAmI();

    expect(!forbidden.ok && forbidden.error).toEqual({ kind: 'forbidden', message: expect.stringContaining('You are not permitted to perform this action.') });
  });

  it('an answer from /me without an id or a username comes back as rejected', async () => {
    mock = meAnswers(() => json({ data: { name: 'Panda' } }));

    const result = await createXApi({ keys: KEYS }).whoAmI();

    expect(!result.ok && result.error.kind).toBe('rejected');
  });

  it('a call that runs past its deadline comes back as a timeout', async () => {
    mock = installFetchMock([{ match: (url) => url === ME_URL, respond: async (_url, init) => hangUntilAborted(init) }]);

    const result = await createXApi({ keys: KEYS, timeoutMs: 20 }).whoAmI();

    expect(!result.ok && result.error.kind).toBe('timeout');
  });

  it('posting text calls POST api.x.com/2/tweets with a JSON body and a signature over the URL, and answers the new id with its x.com link', async () => {
    mock = postAnswers(() => json({ data: { id: POST_ID, text: 'Hello from panda', edit_history_post_ids: [POST_ID] } }, 201));

    const result = await createXApi({ keys: KEYS }).createPost({ text: 'Hello from panda' });

    const headers = new Headers(mock.calls[0]?.init?.headers);
    const parameters = oauthParameters(headers.get('authorization'));
    expect(result).toEqual({ ok: true, value: { id: xPostIdUnsafe(POST_ID), url: `https://x.com/i/status/${POST_ID}` } });
    expect(headers.get('content-type')).toBe('application/json');
    expect(bodyOf(mock.calls[0])).toEqual({ text: 'Hello from panda' });
    expect(parameters['oauth_signature']).toBe(expectedSignature('POST', TWEETS_URL, parameters));
  });

  it('a reply carries reply.in_reply_to_tweet_id, an image post media.media_ids, and an edit edit_options.previous_post_id', async () => {
    mock = postAnswers(() => json({ data: { id: '1880000000000000002', text: 'posted' } }, 201));
    const x = createXApi({ keys: KEYS });

    await x.createPost({ text: 'Part 2', replyTo: xPostIdUnsafe(POST_ID) });
    await x.createPost({ text: 'A chart', mediaIds: [MEDIA_ID] });
    await x.createPost({ text: 'Fixed', editOf: xPostIdUnsafe(POST_ID) });

    expect(mock.calls.map((call) => bodyOf(call))).toEqual([
      { text: 'Part 2', reply: { in_reply_to_tweet_id: POST_ID } },
      { text: 'A chart', media: { media_ids: [MEDIA_ID] } },
      { text: 'Fixed', edit_options: { previous_post_id: POST_ID } },
    ]);
  });

  it("uploading an image sends it base64-encoded as a tweet_image to POST api.x.com/2/media/upload and answers X's media id", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    mock = installFetchMock([{ match: (url, init) => init?.method === 'POST' && url === UPLOAD_URL, respond: () => json({ data: { id: MEDIA_ID, media_key: `3_${MEDIA_ID}` } }) }]);

    const result = await createXApi({ keys: KEYS }).uploadImage({ bytes, format: 'png' });

    expect(result).toEqual({ ok: true, value: MEDIA_ID });
    expect(bodyOf(mock.calls[0])).toEqual({ media: 'iVBORw0KGgoAAQ==', media_category: 'tweet_image' });
  });

  it('deleting calls DELETE api.x.com/2/tweets/<id>, and an answer of deleted: false comes back as rejected', async () => {
    mock = installFetchMock([{ match: (url, init) => init?.method === 'DELETE' && url === `${TWEETS_URL}/${POST_ID}`, respond: () => json({ data: { deleted: true } }) }]);

    const deleted = await createXApi({ keys: KEYS }).deletePost(xPostIdUnsafe(POST_ID));

    expect(deleted).toEqual({ ok: true, value: undefined });

    mock.restore();
    mock = installFetchMock([{ match: () => true, respond: () => json({ data: { deleted: false } }) }]);

    const kept = await createXApi({ keys: KEYS }).deletePost(xPostIdUnsafe(POST_ID));

    expect(!kept.ok && kept.error.kind).toBe('rejected');
  });

  it("a 403 about duplicate content comes back as duplicate-text, and every failure carries X's own words rather than its raw JSON", async () => {
    const duplicate = 'You are not allowed to create a Tweet with duplicate content.';
    const failures: ReadonlyArray<readonly [() => Response, XError]> = [
      [() => json({ title: 'Forbidden', detail: duplicate, type: 'about:blank', status: 403 }, 403), { kind: 'duplicate-text', message: duplicate }],
      [
        () => json({ errors: [{ message: 'The media id is not valid.' }], title: 'Invalid Request', detail: 'One or more parameters to your request was invalid.' }, 400),
        { kind: 'rejected', status: 400, message: 'The media id is not valid.' },
      ],
      [
        () => json({ title: 'CreditsDepleted', detail: 'Your enrolled account does not have any credits.' }, 402),
        { kind: 'credits-depleted', message: 'Your enrolled account does not have any credits.' },
      ],
      [() => json({ code: 88, message: 'Rate limit exceeded' }, 429), { kind: 'rate-limited', message: 'Rate limit exceeded' }],
      [() => json({ title: 'Service Unavailable' }, 503), { kind: 'rejected', status: 503, message: 'Service Unavailable' }],
      [() => new Response('Bad Gateway', { status: 502 }), { kind: 'rejected', status: 502, message: 'Bad Gateway' }],
    ];

    for (const [response, error] of failures) {
      mock = postAnswers(response);

      const result = await createXApi({ keys: KEYS }).createPost({ text: 'Hello from panda' });

      expect(result).toEqual({ ok: false, error });
      mock.restore();
    }
  });
});
