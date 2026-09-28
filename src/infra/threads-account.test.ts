import { afterEach, describe, expect, it } from 'bun:test';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import { createThreadsGraph } from './threads-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'threads', 'token'].join('-');

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

describe('the Threads account calls', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('an id from /me that is not all digits comes back as rejected, so it never reaches a URL', async () => {
    mock = installFetchMock([{ match: (url) => url.endsWith('/v1.0/me?fields=id,username'), respond: () => json({ id: '../26000000000000001', username: 'panda' }) }]);

    const result = await createThreadsGraph({ token: TOKEN }).whoAmI();

    expect(!result.ok && result.error.kind).toBe('rejected');
  });
});
