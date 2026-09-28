import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
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
});
