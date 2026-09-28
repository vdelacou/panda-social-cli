import { afterEach, describe, expect, it } from 'bun:test';
import { PassThrough } from 'node:stream';
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
