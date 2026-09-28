import { afterEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { XKeys } from '../domain/x-keys.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import { createXApi } from './x-api.ts';

// Built at runtime so no secret-looking literal sits beside a key-shaped name.
const KEYS: XKeys = {
  apiKey: ['test', 'api', 'key'].join('-'),
  apiSecret: ['test', 'api', 'secret'].join('-'),
  accessToken: ['test', 'access', 'token'].join('-'),
  accessSecret: ['test', 'access', 'secret'].join('-'),
};
const ME_URL = 'https://api.x.com/2/users/me';

const json = (body: unknown, status = 200, headers: Readonly<Record<string, string>> = {}): Response =>
  Response.json(body, { status, headers: { 'content-type': 'application/json', ...headers } });

const meAnswers = (response: () => Response): FetchMock => installFetchMock([{ match: (url, init) => init?.method === 'GET' && url === ME_URL, respond: response }]);

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
});
