import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import packageJson from '../../package.json' with { type: 'json' };
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import { runCli } from './run-cli.ts';

const POST_ID = '17890000000000001';
const PERMALINK = 'https://www.threads.com/@panda/post/C0ffee';

const json = (body: unknown): Response => Response.json(body, { headers: { 'content-type': 'application/json' } });

const runPost = async (env: Readonly<Record<string, string>>): Promise<{ readonly exitCode: number; readonly answers: ReadonlyArray<unknown> }> => {
  const lines: string[] = [];
  const exitCode = await runCli({
    argv: ['post', '--to', 'threads', '--text', 'Hello from panda'],
    env,
    writeOut: (line) => {
      lines.push(line);
    },
    logStream: new PassThrough(),
  });
  return { exitCode, answers: lines.map((line) => JSON.parse(line) as unknown) };
};

describe('running `panda-social post`', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('without PANDA_SOCIAL_THREADS_TOKEN the run exits 1 and the hint says how to set it', async () => {
    const { exitCode, answers } = await runPost({});

    expect(exitCode).toBe(1);
    expect(answers).toEqual([{ ok: false, error: { code: 'missing-credentials', message: expect.any(String), hint: expect.stringContaining('PANDA_SOCIAL_THREADS_TOKEN') } }]);
  });

  it('a full run against a fake Threads API prints the success result and exits 0', async () => {
    mock = installFetchMock([
      { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: POST_ID }) },
      { match: (url) => url.includes(`/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
    ]);

    const { exitCode, answers } = await runPost({ PANDA_SOCIAL_THREADS_TOKEN: ['test', 'threads', 'token'].join('-') });

    expect(exitCode).toBe(0);
    expect(answers).toEqual([{ ok: true, data: { platform: 'threads', id: POST_ID, url: PERMALINK } }]);
  });
});

const STORED = ['stored', 'threads', 'token'].join('-');
const OVERRIDE = ['override', 'threads', 'token'].join('-');

const run = async (
  argv: ReadonlyArray<string>,
  env: Readonly<Record<string, string>>,
  stdin = ''
): Promise<{ readonly exitCode: number; readonly answers: ReadonlyArray<unknown> }> => {
  const lines: string[] = [];
  const exitCode = await runCli({
    argv,
    env,
    writeOut: (line) => {
      lines.push(line);
    },
    logStream: new PassThrough(),
    readStdin: async () => stdin,
  });
  return { exitCode, answers: lines.map((line) => JSON.parse(line) as unknown) };
};

const threadsApi = (): FetchMock =>
  installFetchMock([
    { match: (url) => url.endsWith('/me?fields=id,username'), respond: () => json({ id: '26000000000000001', username: 'panda' }) },
    { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: POST_ID }) },
    { match: (url) => url.includes(`/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
  ]);

const publishToken = (mock: FetchMock): string | null => new Headers(mock.calls.find((call) => call.url.endsWith('/me/threads'))?.init?.headers).get('authorization');

describe('connecting Threads with `panda-social setup threads`', () => {
  let home = '';
  let mock: FetchMock | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-'));
  });
  afterEach(() => {
    mock?.restore();
    rmSync(home, { recursive: true, force: true });
  });

  it('without a terminal, `setup threads` prints the step-by-step guide as JSON with the command that finishes it', async () => {
    const { exitCode, answers } = await run(['setup', 'threads'], { HOME: home });

    expect(exitCode).toBe(0);
    expect(answers).toEqual([
      {
        ok: true,
        data: {
          platform: 'threads',
          profile: 'default',
          steps: expect.arrayContaining([
            expect.objectContaining({ step: 1, title: 'Create your Meta developer account' }),
            expect.objectContaining({ step: 6, title: 'Generate your access token' }),
          ]),
          finish: expect.stringContaining('panda-social setup threads --token-stdin'),
        },
      },
    ]);
  });

  it('a piped token is checked against Threads and saved, and then `post` works with no environment variable', async () => {
    mock = threadsApi();

    const setup = await run(['setup', 'threads', '--token-stdin'], { HOME: home }, `${STORED}\n`);
    const posted = await run(['post', '--to', 'threads', '--text', 'Hello from panda'], { HOME: home });

    expect(setup).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'threads', profile: 'default', userId: '26000000000000001', username: 'panda' } }] });
    expect(posted.exitCode).toBe(0);
    expect(publishToken(mock)).toBe(`Bearer ${STORED}`);
  });

  it('PANDA_SOCIAL_THREADS_TOKEN overrides the saved token', async () => {
    mock = threadsApi();

    const setup = await run(['setup', 'threads', '--token-stdin'], { HOME: home }, STORED);
    const posted = await run(['post', '--to', 'threads', '--text', 'Hello from panda'], { HOME: home, PANDA_SOCIAL_THREADS_TOKEN: OVERRIDE });

    expect(setup.exitCode).toBe(0);
    expect(posted.exitCode).toBe(0);
    expect(publishToken(mock)).toBe(`Bearer ${OVERRIDE}`);
  });

  it('a saved token 31 days old is refreshed before a post: the post goes out with the new token, which is saved with its expiry', async () => {
    const fresh = ['fresh', 'threads', 'token'].join('-');
    const file = path.join(home, '.panda-social', 'credentials.json');
    const account = { userId: '26000000000000001', username: 'panda' };
    const savedAt = new Date(Date.now() - 31 * 86_400_000).toISOString();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ version: 1, profiles: { default: { threads: { token: STORED, ...account, savedAt } } } }));
    mock = installFetchMock([
      {
        match: (url) => url === 'https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token',
        respond: () => json({ access_token: fresh, token_type: 'bearer', expires_in: 5_184_000 }),
      },
      { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: POST_ID }) },
      { match: (url) => url.includes(`/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
    ]);

    const posted = await run(['post', '--to', 'threads', '--text', 'Hello from panda'], { HOME: home });

    expect(posted.exitCode).toBe(0);
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${STORED}`);
    expect(publishToken(mock)).toBe(`Bearer ${fresh}`);
    expect(JSON.parse(readFileSync(file, 'utf8')) as unknown).toEqual({
      version: 1,
      profiles: { default: { threads: { token: fresh, ...account, savedAt: expect.any(String), expiresAt: expect.any(String) } } },
    });
  });

  it('a profile with no saved token fails with a hint to run setup threads', async () => {
    const posted = await run(['post', '--to', 'threads', '--text', 'Hello from panda', '--profile', 'brand-a'], { HOME: home });

    expect(posted).toEqual({
      exitCode: 1,
      answers: [{ ok: false, error: { code: 'missing-credentials', message: expect.any(String), hint: expect.stringContaining('panda-social setup threads') } }],
    });
  });
});

describe('the agent entry points', () => {
  it('`--version` prints the package name and version', async () => {
    expect(await run(['--version'], {})).toEqual({ exitCode: 0, answers: [{ ok: true, data: { name: 'panda-social-cli', version: packageJson.version } }] });
  });

  it('`help-json` prints the manifest with every command', async () => {
    const { exitCode, answers } = await run(['help-json'], {});
    const everyCommand = expect.arrayContaining(['post', 'setup', 'help-json', 'docs'].map((name) => expect.objectContaining({ name })));

    expect(exitCode).toBe(0);
    expect(answers).toEqual([{ ok: true, data: expect.objectContaining({ name: 'panda-social-cli', version: packageJson.version, commands: everyCommand }) }]);
  });

  it('`docs post` prints the post page as markdown', async () => {
    const { exitCode, answers } = await run(['docs', 'post'], {});

    expect(exitCode).toBe(0);
    expect(answers).toEqual([{ ok: true, data: { command: 'post', markdown: expect.stringContaining('## post') } }]);
  });
});

// One quota as Threads answers it: the usage, and its total over 24 hours.
const quota = (used: number, total: number): { readonly quota_usage: number; readonly config: { readonly quota_total: number; readonly quota_duration: number } } => ({
  quota_usage: used,
  config: { quota_total: total, quota_duration: 86_400 },
});

describe('the Threads features, end to end', () => {
  const CONTAINER = '18000000000000001';
  const NEW_ID = '17890000000000002';
  const env = { PANDA_SOCIAL_THREADS_TOKEN: ['env', 'threads', 'token'].join('-') };
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('an image post runs end to end against a fake Threads API: container, status, publish, permalink', async () => {
    mock = installFetchMock([
      { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: CONTAINER }) },
      { match: (url) => url.includes(`/${CONTAINER}?fields=status`), respond: () => json({ status: 'FINISHED' }) },
      { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads_publish'), respond: () => json({ id: POST_ID }) },
      { match: (url) => url.includes(`/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
    ]);

    const result = await run(['post', '--to', 'threads', '--image', 'https://cdn.example.com/cat.jpg', '--text', 'A cat'], env);

    expect(result).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'threads', id: POST_ID, url: PERMALINK } }] });
  });

  it('`delete` runs end to end and answers the deleted id', async () => {
    mock = installFetchMock([{ match: (url, init) => init?.method === 'DELETE' && url.endsWith(`/${POST_ID}`), respond: () => json({ success: true, deleted_id: POST_ID }) }]);

    const result = await run(['delete', '--on', 'threads', '--id', POST_ID], env);

    expect(result).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'threads', id: POST_ID, deleted: true } }] });
  });

  it('`update --repost` runs end to end: the old post is deleted, then the new one published', async () => {
    mock = installFetchMock([
      { match: (url, init) => init?.method === 'DELETE' && url.endsWith(`/${POST_ID}`), respond: () => json({ success: true, deleted_id: POST_ID }) },
      { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: NEW_ID }) },
      { match: (url) => url.includes(`/${NEW_ID}?fields=permalink`), respond: () => json({ id: NEW_ID, permalink: PERMALINK }) },
    ]);

    const result = await run(['update', '--on', 'threads', '--id', POST_ID, '--text', 'Fixed', '--repost'], env);

    expect(result).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'threads', id: NEW_ID, url: PERMALINK, replaced: POST_ID } }] });
    expect(mock.calls.map((call) => call.init?.method)).toEqual(['DELETE', 'POST', 'GET']);
  });

  it('`status threads` runs end to end: the account, the token source and the three quotas', async () => {
    const posts = quota(3, 250);
    mock = installFetchMock([
      { match: (url) => url.endsWith('/me?fields=id,username'), respond: () => json({ id: '26000000000000001', username: 'panda' }) },
      {
        match: (url) => url.includes('/26000000000000001/threads_publishing_limit?'),
        respond: () => json({ data: [{ ...posts, reply_quota_usage: 0, reply_config: quota(0, 1000).config, delete_quota_usage: 0, delete_config: quota(0, 100).config }] }),
      },
    ]);

    const result = await run(['status', 'threads'], env);

    expect(result).toEqual({
      exitCode: 0,
      answers: [
        {
          ok: true,
          data: {
            platform: 'threads',
            profile: 'default',
            account: { userId: '26000000000000001', username: 'panda' },
            token: { source: 'environment' },
            limits: {
              posts: { used: 3, total: 250, windowSeconds: 86_400 },
              replies: { used: 0, total: 1000, windowSeconds: 86_400 },
              deletes: { used: 0, total: 100, windowSeconds: 86_400 },
            },
          },
        },
      ],
    });
  });
});

const X_USER = { id: '1600000000000000001', name: 'Panda', username: 'panda' };
const X_KEY_LINES = [['saved', 'api', 'key'].join('-'), ['saved', 'api', 'secret'].join('-'), ['saved', 'access', 'token'].join('-'), ['saved', 'access', 'secret'].join('-')];

const xApi = (): FetchMock =>
  installFetchMock([
    {
      match: (url, init) => init?.method === 'GET' && url === 'https://api.x.com/2/users/me',
      respond: () => Response.json({ data: X_USER }, { headers: { 'content-type': 'application/json', 'x-access-level': 'read-write' } }),
    },
  ]);

const lastAuthorization = (mock: FetchMock): string => new Headers(mock.calls.at(-1)?.init?.headers).get('authorization') ?? '';

describe('connecting X with `panda-social setup x`', () => {
  let home = '';
  let mock: FetchMock | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-'));
  });
  afterEach(() => {
    mock?.restore();
    rmSync(home, { recursive: true, force: true });
  });

  it('without a terminal, `setup x` prints the five X steps as JSON with the command that finishes it', async () => {
    const { exitCode, answers } = await run(['setup', 'x'], { HOME: home });

    expect(exitCode).toBe(0);
    expect(answers).toEqual([
      {
        ok: true,
        data: {
          platform: 'x',
          profile: 'default',
          steps: expect.arrayContaining([
            expect.objectContaining({ step: 1, title: 'Sign in to the X developer console' }),
            expect.objectContaining({ step: 5, title: 'Generate the four keys' }),
          ]),
          finish: expect.stringContaining('panda-social setup x --keys-stdin'),
        },
      },
    ]);
  });

  it('four keys piped to `setup x --keys-stdin` are checked with X and saved, and `status x` then answers from them', async () => {
    mock = xApi();

    const setup = await run(['setup', 'x', '--keys-stdin'], { HOME: home }, `${X_KEY_LINES.join('\n')}\n`);
    const status = await run(['status', 'x'], { HOME: home });

    expect(setup).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'x', profile: 'default', userId: X_USER.id, username: 'panda', note: expect.any(String) } }] });
    expect(status).toEqual({
      exitCode: 0,
      answers: [
        {
          ok: true,
          data: {
            platform: 'x',
            profile: 'default',
            account: { userId: X_USER.id, username: 'panda' },
            accessLevel: 'read-write',
            keys: { source: 'saved', savedAt: expect.any(String) },
          },
        },
      ],
    });
  });

  it('the four PANDA_SOCIAL_X_ variables override the saved keys, and setting only some of them fails naming the missing ones', async () => {
    mock = xApi();
    const env = {
      HOME: home,
      PANDA_SOCIAL_X_API_KEY: ['env', 'api', 'key'].join('-'),
      PANDA_SOCIAL_X_API_SECRET: ['env', 'api', 'secret'].join('-'),
      PANDA_SOCIAL_X_ACCESS_TOKEN: ['env', 'access', 'token'].join('-'),
      PANDA_SOCIAL_X_ACCESS_SECRET: ['env', 'access', 'secret'].join('-'),
    };

    await run(['setup', 'x', '--keys-stdin'], { HOME: home }, X_KEY_LINES.join('\n'));
    const overridden = await run(['status', 'x'], env);
    const partial = await run(['status', 'x'], { HOME: home, PANDA_SOCIAL_X_API_KEY: env.PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET: env.PANDA_SOCIAL_X_API_SECRET });

    expect(overridden.answers).toEqual([{ ok: true, data: expect.objectContaining({ keys: { source: 'environment' } }) }]);
    expect(lastAuthorization(mock)).toContain(`oauth_consumer_key="${env.PANDA_SOCIAL_X_API_KEY}"`);
    expect(partial.exitCode).toBe(1);
    expect(partial.answers).toEqual([
      {
        ok: false,
        error: { code: 'incomplete-environment', message: expect.stringMatching(/PANDA_SOCIAL_X_ACCESS_TOKEN.*PANDA_SOCIAL_X_ACCESS_SECRET/), hint: expect.any(String) },
      },
    ]);
  });

  it('`status x` with no saved keys fails with missing-credentials and a hint to run setup x', async () => {
    const status = await run(['status', 'x'], { HOME: home });

    expect(status).toEqual({
      exitCode: 1,
      answers: [{ ok: false, error: { code: 'missing-credentials', message: expect.any(String), hint: expect.stringContaining('panda-social setup x') } }],
    });
  });
});

const X_POSTED = '1880000000000000001';
const X_EDITED = '1880000000000000009';
const X_MEDIA = '1890000000000000001';
const X_TWEETS = 'https://api.x.com/2/tweets';
const X_UPLOAD = 'https://api.x.com/2/media/upload';
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

// api.x.com as the posting commands meet it: the account check of the setup, a post, an upload and a delete.
const xPostingApi = (): FetchMock =>
  installFetchMock([
    {
      match: (url, init) => init?.method === 'GET' && url === 'https://api.x.com/2/users/me',
      respond: () => Response.json({ data: X_USER }, { headers: { 'content-type': 'application/json', 'x-access-level': 'read-write' } }),
    },
    { match: (url, init) => init?.method === 'POST' && url === X_TWEETS, respond: () => Response.json({ data: { id: X_POSTED, text: 'posted' } }, { status: 201 }) },
    { match: (url, init) => init?.method === 'POST' && url === X_UPLOAD, respond: () => Response.json({ data: { id: X_MEDIA } }) },
    { match: (url, init) => init?.method === 'DELETE' && url === `${X_TWEETS}/${X_EDITED}`, respond: () => Response.json({ data: { deleted: true } }) },
  ]);

const requestBody = (mock: FetchMock, url: string): unknown => JSON.parse(String(mock.calls.find((call) => call.url === url)?.init?.body));

describe('posting to X with `panda-social post --to x`', () => {
  let home = '';
  let mock: FetchMock | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-'));
  });
  afterEach(() => {
    mock?.restore();
    rmSync(home, { recursive: true, force: true });
  });

  it('`post --to x` with saved keys posts through api.x.com and prints the new id and its x.com link', async () => {
    mock = xPostingApi();
    await run(['setup', 'x', '--keys-stdin'], { HOME: home }, X_KEY_LINES.join('\n'));

    const posted = await run(['post', '--to', 'x', '--text', 'Hello from panda'], { HOME: home });

    expect(posted).toEqual({ exitCode: 0, answers: [{ ok: true, data: { platform: 'x', id: X_POSTED, url: `https://x.com/i/status/${X_POSTED}` } }] });
    expect(requestBody(mock, X_TWEETS)).toEqual({ text: 'Hello from panda' });
  });

  it('`post --to x --image <file>` uploads the file, then posts it with its media id', async () => {
    mock = xPostingApi();
    const chart = path.join(home, 'chart.png');
    writeFileSync(chart, PNG_BYTES);
    await run(['setup', 'x', '--keys-stdin'], { HOME: home }, X_KEY_LINES.join('\n'));

    const posted = await run(['post', '--to', 'x', '--image', chart, '--text', 'The chart'], { HOME: home });

    expect(posted.exitCode).toBe(0);
    expect(requestBody(mock, X_UPLOAD)).toEqual({ media: 'iVBORw0KGgoAAQ==', media_category: 'tweet_image' });
    expect(requestBody(mock, X_TWEETS)).toEqual({ text: 'The chart', media: { media_ids: [X_MEDIA] } });
  });

  it('`update --on x` edits the post in place and `delete --on x` deletes it, both through api.x.com', async () => {
    mock = xPostingApi();
    await run(['setup', 'x', '--keys-stdin'], { HOME: home }, X_KEY_LINES.join('\n'));

    const edited = await run(['update', '--on', 'x', '--id', X_EDITED, '--text', 'Fixed'], { HOME: home });
    const deleted = await run(['delete', '--on', 'x', '--id', X_EDITED], { HOME: home });

    expect(edited.answers).toEqual([{ ok: true, data: { platform: 'x', id: X_POSTED, url: `https://x.com/i/status/${X_POSTED}`, edited: X_EDITED } }]);
    expect(requestBody(mock, X_TWEETS)).toEqual({ text: 'Fixed', edit_options: { previous_post_id: X_EDITED } });
    expect(deleted.answers).toEqual([{ ok: true, data: { platform: 'x', id: X_EDITED, deleted: true } }]);
  });
});

const FACEBOOK_ACCOUNTS = 'https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token,tasks&limit=100';
const FACEBOOK_ME = 'https://graph.facebook.com/v26.0/me?fields=id,name';
const FACEBOOK_USER_TOKEN = ['user', 'token'].join('-');
const BAKERY_TOKEN = ['bakery', 'page', 'token'].join('-');
const BOOKS_TOKEN = ['books', 'page', 'token'].join('-');

// /me answers the Page whose token asks: Panda Books for its own token, Panda Bakery for any other.
const pageOf = (init: RequestInit | undefined): { readonly id: string; readonly name: string } =>
  new Headers(init?.headers).get('authorization') === `Bearer ${BOOKS_TOKEN}` ? { id: '104000000000002', name: 'Panda Books' } : { id: '104000000000001', name: 'Panda Bakery' };

// graph.facebook.com as the setup and the status meet it: the Pages a user token grants, and whose Page token it is.
const facebookGraph = (): FetchMock =>
  installFetchMock([
    {
      match: (url, init) => init?.method === 'GET' && url === FACEBOOK_ACCOUNTS,
      respond: () =>
        Response.json({
          data: [
            { access_token: BAKERY_TOKEN, name: 'Panda Bakery', id: '104000000000001', tasks: ['CREATE_CONTENT', 'MANAGE'] },
            { access_token: BOOKS_TOKEN, name: 'Panda Books', id: '104000000000002', tasks: ['CREATE_CONTENT'] },
          ],
        }),
    },
    { match: (url, init) => init?.method === 'GET' && url === FACEBOOK_ME, respond: (_url, init) => Response.json(pageOf(init)) },
  ]);

describe('connecting a Facebook Page with `panda-social setup facebook`', () => {
  let home = '';
  let mock: FetchMock | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-'));
  });
  afterEach(() => {
    mock?.restore();
    rmSync(home, { recursive: true, force: true });
  });

  it('without a terminal, `setup facebook` prints the five Facebook steps as JSON with the command that finishes it', async () => {
    const { exitCode, answers } = await run(['setup', 'facebook'], { HOME: home });

    expect(exitCode).toBe(0);
    expect(answers).toEqual([
      {
        ok: true,
        data: {
          platform: 'facebook',
          profile: 'default',
          steps: expect.arrayContaining([
            expect.objectContaining({ step: 1, title: 'Create an app that can manage your Page' }),
            expect.objectContaining({ step: 5, title: 'Extend the token to 60 days' }),
          ]),
          finish: expect.stringContaining('panda-social setup facebook --token-stdin'),
        },
      },
    ]);
  });

  it('a token piped to `setup facebook --token-stdin --page <id>` is checked with Meta and that Page token is saved, never the user token, and `status facebook` then answers with the Page', async () => {
    mock = facebookGraph();

    const setup = await run(['setup', 'facebook', '--token-stdin', '--page', '104000000000002'], { HOME: home }, `${FACEBOOK_USER_TOKEN}\n`);
    const status = await run(['status', 'facebook'], { HOME: home });

    expect(setup).toEqual({
      exitCode: 0,
      answers: [{ ok: true, data: { platform: 'facebook', profile: 'default', pageId: '104000000000002', pageName: 'Panda Books', note: expect.stringContaining('published') } }],
    });
    expect(readFileSync(path.join(home, '.panda-social', 'credentials.json'), 'utf8')).not.toContain(FACEBOOK_USER_TOKEN);
    expect(lastAuthorization(mock)).toBe(`Bearer ${BOOKS_TOKEN}`);
    expect(status).toEqual({
      exitCode: 0,
      answers: [
        {
          ok: true,
          data: { platform: 'facebook', profile: 'default', page: { id: '104000000000002', name: 'Panda Books' }, token: { source: 'saved', savedAt: expect.any(String) } },
        },
      ],
    });
  });

  it('PANDA_SOCIAL_FACEBOOK_PAGE_ID and _PAGE_TOKEN override the saved Page, and setting only the id fails as incomplete-environment naming the token variable', async () => {
    mock = facebookGraph();
    const envToken = ['env', 'page', 'token'].join('-');

    await run(['setup', 'facebook', '--token-stdin', '--page', '104000000000002'], { HOME: home }, FACEBOOK_USER_TOKEN);
    const overridden = await run(['status', 'facebook'], { HOME: home, PANDA_SOCIAL_FACEBOOK_PAGE_ID: '104000000000001', PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN: envToken });
    const partial = await run(['status', 'facebook'], { HOME: home, PANDA_SOCIAL_FACEBOOK_PAGE_ID: '104000000000001' });

    expect(overridden.answers).toEqual([{ ok: true, data: expect.objectContaining({ page: { id: '104000000000001', name: 'Panda Bakery' }, token: { source: 'environment' } }) }]);
    expect(lastAuthorization(mock)).toBe(`Bearer ${envToken}`);
    expect(partial.exitCode).toBe(1);
    expect(partial.answers).toEqual([
      { ok: false, error: { code: 'incomplete-environment', message: expect.stringContaining('PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN'), hint: expect.any(String) } },
    ]);
  });

  it('`status facebook` with no saved Page fails with missing-credentials and a hint to run setup facebook', async () => {
    const status = await run(['status', 'facebook'], { HOME: home });

    expect(status).toEqual({
      exitCode: 1,
      answers: [{ ok: false, error: { code: 'missing-credentials', message: expect.any(String), hint: expect.stringContaining('panda-social setup facebook') } }],
    });
  });

  it('a Page id that is not digits, in the environment or hand-edited into the credentials file, fails as invalid-page-id before Meta is called', async () => {
    mock = facebookGraph();

    const fromEnvironment = await run(['status', 'facebook'], {
      HOME: home,
      PANDA_SOCIAL_FACEBOOK_PAGE_ID: 'abc',
      PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN: ['env', 'page', 'token'].join('-'),
    });
    mkdirSync(path.join(home, '.panda-social'), { recursive: true });
    writeFileSync(
      path.join(home, '.panda-social', 'credentials.json'),
      JSON.stringify({ version: 1, profiles: { default: { facebook: { pageId: '../feed', pageName: 'Panda Bakery', token: BAKERY_TOKEN, savedAt: '2026-09-28T09:30:00.000Z' } } } })
    );
    const fromFile = await run(['status', 'facebook'], { HOME: home });

    for (const answer of [fromEnvironment, fromFile]) {
      expect(answer).toEqual({ exitCode: 1, answers: [{ ok: false, error: { code: 'invalid-page-id', message: expect.any(String), hint: expect.any(String) } }] });
    }
    expect(mock.calls).toEqual([]);
  });
});
