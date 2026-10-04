import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import packageJson from '../../package.json' with { type: 'json' };
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock } from '../test-helpers/fetch-mock.ts';
import { openMcpSession } from '../test-helpers/mcp-session.ts';
import type { McpSession } from '../test-helpers/mcp-session.ts';
import { runCli } from './run-cli.ts';

const POST_ID = '17890000000000001';
const NEW_ID = '17890000000000002';
const USER_ID = '26000000000000001';
const PERMALINK = 'https://www.threads.com/@panda/post/C0ffee';
const TOKEN = ['mcp', 'threads', 'token'].join('-');

const json = (body: unknown): Response => Response.json(body, { headers: { 'content-type': 'application/json' } });

// The line the CLI prints for the same words, to set a tool result against.
const cliLine = async (argv: ReadonlyArray<string>, env: Readonly<Record<string, string>>): Promise<string> => {
  const lines: string[] = [];
  await runCli({
    argv,
    env,
    writeOut: (line) => {
      lines.push(line);
    },
    logStream: new PassThrough(),
  });
  return lines.join('\n');
};

const quota = (used: number, total: number): { readonly quota_usage: number; readonly config: { readonly quota_total: number; readonly quota_duration: number } } => ({
  quota_usage: used,
  config: { quota_total: total, quota_duration: 86_400 },
});

const threadsApi = (): FetchMock =>
  installFetchMock([
    { match: (url) => url.endsWith('/me?fields=id,username'), respond: () => json({ id: USER_ID, username: 'panda' }) },
    {
      match: (url) => url.includes(`/${USER_ID}/threads_publishing_limit?`),
      respond: () => json({ data: [{ ...quota(3, 250), reply_quota_usage: 0, reply_config: quota(0, 1000).config, delete_quota_usage: 0, delete_config: quota(0, 100).config }] }),
    },
    { match: (url, init) => init?.method === 'DELETE' && url.endsWith(`/${POST_ID}`), respond: () => json({ success: true, deleted_id: POST_ID }) },
    { match: (url, init) => init?.method === 'POST' && url.endsWith('/me/threads'), respond: () => json({ id: NEW_ID }) },
    { match: (url) => url.includes(`/${NEW_ID}?fields=permalink`), respond: () => json({ id: NEW_ID, permalink: PERMALINK }) },
  ]);

const sentText = (mock: FetchMock): string | null => new URLSearchParams(mock.calls.find((call) => call.url.endsWith('/me/threads'))?.init?.body as URLSearchParams).get('text');

type Envelope = { readonly ok: boolean; readonly error?: { readonly code: string; readonly message: string; readonly hint: string } };

const envelopeOf = (text: string): Envelope => JSON.parse(text) as Envelope;

describe('serving the commands to an MCP client with `panda-social mcp`', () => {
  let home = '';
  let env: Readonly<Record<string, string>> = {};
  let session: McpSession | undefined;
  let mock: FetchMock | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-mcp-'));
    env = { HOME: home, PANDA_SOCIAL_THREADS_TOKEN: TOKEN };
  });
  afterEach(async () => {
    await session?.close();
    session = undefined;
    mock?.restore();
    mock = undefined;
    rmSync(home, { recursive: true, force: true });
  });

  describe('the connection', () => {
    it('a client that connects gets the name panda-social, the package version, and instructions for agents', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      expect(session.hello).toEqual(
        expect.objectContaining({
          serverInfo: expect.objectContaining({ name: 'panda-social', version: packageJson.version }),
          instructions: expect.stringContaining('list-commands'),
        })
      );
      expect(session.hello['instructions']).toEqual(expect.stringContaining('get a yes'));
    });

    it('the server has five tools, and only run-write-command can change an account, marked as destructive', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.request('tools/list');
      const tools = (answer.result?.['tools'] ?? []) as ReadonlyArray<{ readonly name: string; readonly annotations?: Readonly<Record<string, unknown>> }>;

      expect(tools.map((tool) => tool.name)).toEqual(['list-commands', 'get-command-docs', 'get-setup-guide', 'run-command', 'run-write-command']);
      expect(tools.filter((tool) => tool.annotations?.['readOnlyHint'] === true).map((tool) => tool.name)).toEqual([
        'list-commands',
        'get-command-docs',
        'get-setup-guide',
        'run-command',
      ]);
      expect(tools.at(-1)?.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true });
    });

    it('when the client closes stdin, the server stops and `panda-social mcp` exits 0', async () => {
      const opened = await openMcpSession(runCli, { HOME: home });

      expect(await opened.close()).toBe(0);
    });

    it('each line on stdout is a JSON-RPC 2.0 message, also after a failed command', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      await session.callTool('run-command', { command: 'status', params: { platform: 'threads' } });
      await session.callTool('list-commands');

      expect(session.stdoutLines().length).toBeGreaterThan(0);
      for (const line of session.stdoutLines()) expect(JSON.parse(line)).toEqual(expect.objectContaining({ jsonrpc: '2.0' }));
    });
  });

  describe('the discovery of the commands', () => {
    it('list-commands gives post, update, delete, setup and status with the tool that runs each, and not the commands only for the CLI', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('list-commands');
      const listed = JSON.parse(answer.text) as { readonly commands: ReadonlyArray<{ readonly name: string; readonly summary: string; readonly tool: string }> };

      expect(answer.isError).toBe(false);
      expect(listed.commands.map(({ name, tool }) => [name, tool])).toEqual([
        ['post', 'run-write-command'],
        ['update', 'run-write-command'],
        ['delete', 'run-write-command'],
        ['setup', 'get-setup-guide'],
        ['status', 'run-command'],
      ]);
      expect(listed.commands.every((command) => command.summary.length > 0)).toBe(true);
    });

    it('get-command-docs gives the same page as `panda-social docs post`', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('get-command-docs', { command: 'post' });
      const cli = JSON.parse(await cliLine(['docs', 'post'], { HOME: home })) as { readonly data: { readonly markdown: string } };

      expect(answer).toEqual({ text: cli.data.markdown, isError: false });
    });

    it('get-command-docs for "psot" is a tool error that names the command meant', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('get-command-docs', { command: 'psot' });

      expect(answer.isError).toBe(true);
      expect(envelopeOf(answer.text)).toEqual({
        ok: false,
        error: { code: 'unknown-command', message: expect.any(String), hint: expect.stringContaining('Did you mean "post"?') },
      });
    });

    it('get-setup-guide gives the same steps as `panda-social setup threads` without a terminal', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('get-setup-guide', { platform: 'threads' });

      expect(answer).toEqual({ text: await cliLine(['setup', 'threads'], { HOME: home }), isError: false });
    });
  });

  describe('the read tool', () => {
    it('run-command runs `status threads` against a fake Threads API and gives the line that the CLI prints', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-command', { command: 'status', params: { platform: 'threads' } });

      expect(answer).toEqual({ text: await cliLine(['status', 'threads'], env), isError: false });
      expect(JSON.parse(answer.text)).toEqual({ ok: true, data: expect.objectContaining({ account: { userId: USER_ID, username: 'panda' } }) });
    });

    it('a failed command is a tool error with the code and the hint of the CLI', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('run-command', { command: 'status', params: { platform: 'threads' } });

      expect(answer.isError).toBe(true);
      expect(envelopeOf(answer.text)).toEqual({
        ok: false,
        error: { code: 'missing-credentials', message: expect.any(String), hint: expect.stringContaining('PANDA_SOCIAL_THREADS_TOKEN') },
      });
    });

    it('run-command rejects post before a request goes out, and names run-write-command', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-command', { command: 'post', params: { to: 'threads', text: 'Hello from panda' } });

      expect(answer.isError).toBe(true);
      expect(envelopeOf(answer.text)).toEqual({ ok: false, error: { code: 'wrong-tool', message: expect.any(String), hint: expect.stringContaining('run-write-command') } });
      expect(mock.calls).toEqual([]);
    });

    it('the run tools reject setup, help-json, docs and mcp, and name the tool to use instead', async () => {
      session = await openMcpSession(runCli, { HOME: home });
      const calls = [
        ['run-command', 'setup', 'get-setup-guide'],
        ['run-write-command', 'setup', 'get-setup-guide'],
        ['run-command', 'help-json', 'list-commands'],
        ['run-command', 'docs', 'get-command-docs'],
        ['run-write-command', 'mcp', 'list-commands'],
      ] as const;

      for (const [tool, command, instead] of calls) {
        const answer = await session.callTool(tool, { command, params: { platform: 'threads', 'token-stdin': true } });
        expect(answer.isError).toBe(true);
        expect(envelopeOf(answer.text)).toEqual({ ok: false, error: { code: 'wrong-tool', message: expect.any(String), hint: expect.stringContaining(instead) } });
      }
    });

    it('run-command with "stauts" names the command meant and list-commands', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('run-command', { command: 'stauts', params: { platform: 'threads' } });

      expect(answer.isError).toBe(true);
      expect(envelopeOf(answer.text)).toEqual({
        ok: false,
        error: { code: 'unknown-command', message: expect.any(String), hint: expect.stringContaining('Did you mean "status"?') },
      });
      expect(envelopeOf(answer.text).error?.hint).toContain('list-commands');
    });
  });

  describe('the write tool', () => {
    it('run-write-command posts to Threads one time and gives the id and the url, as `panda-social post` does', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-write-command', { command: 'post', params: { to: 'threads', text: 'Hello from panda' } });

      expect(answer).toEqual({ text: JSON.stringify({ ok: true, data: { platform: 'threads', id: NEW_ID, url: PERMALINK } }), isError: false });
      expect(mock.calls.filter((call) => call.init?.method === 'POST')).toHaveLength(1);
    });

    it('run-write-command rejects status and names run-command', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-write-command', { command: 'status', params: { platform: 'threads' } });

      expect(answer.isError).toBe(true);
      expect(envelopeOf(answer.text)).toEqual({ ok: false, error: { code: 'wrong-tool', message: expect.any(String), hint: expect.stringContaining('run-command') } });
      expect(mock.calls).toEqual([]);
    });

    it('a text that starts with a dash stays the text of the post', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-write-command', { command: 'post', params: { to: 'threads', text: '-20% today' } });

      expect(answer.isError).toBe(false);
      expect(sentText(mock)).toBe('-20% today');
    });

    it('repost true is the --repost flag, which deletes the old post and publishes the new text; repost false sends nothing and answers unsupported', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const kept = await session.callTool('run-write-command', { command: 'update', params: { on: 'threads', id: POST_ID, text: 'Fixed', repost: false } });

      expect(envelopeOf(kept.text)).toEqual({ ok: false, error: expect.objectContaining({ code: 'unsupported' }) });
      expect(mock.calls).toEqual([]);

      const replaced = await session.callTool('run-write-command', { command: 'update', params: { on: 'threads', id: POST_ID, text: 'Fixed', repost: true } });

      expect(JSON.parse(replaced.text)).toEqual({ ok: true, data: { platform: 'threads', id: NEW_ID, url: PERMALINK, replaced: POST_ID } });
      expect(mock.calls.map((call) => call.init?.method)).toEqual(['DELETE', 'POST', 'GET']);
    });

    it('a param written as "--text" works as text, and an unknown param gets the did-you-mean of the CLI', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const dashed = await session.callTool('run-write-command', { command: 'post', params: { '--to': 'threads', '--text': 'Hello from panda' } });
      const unknown = await session.callTool('run-write-command', { command: 'post', params: { to: 'threads', txt: 'Hello from panda' } });

      expect(dashed.isError).toBe(false);
      expect(sentText(mock)).toBe('Hello from panda');
      expect(envelopeOf(unknown.text)).toEqual({
        ok: false,
        error: { code: 'unknown-option', message: 'post has no --txt option.', hint: expect.stringContaining('Did you mean "--text"?') },
      });
    });

    it('a post id sent as a JSON number stops the call before the CLI runs, thus the id cannot lose digits', async () => {
      mock = threadsApi();
      session = await openMcpSession(runCli, env);

      const answer = await session.callTool('run-write-command', { command: 'delete', params: { on: 'threads', id: Number(POST_ID) } });

      expect(answer.isError).toBe(true);
      expect(mock.calls).toEqual([]);
    });
  });

  it('`panda-social docs mcp` gives the page with the command that registers the server in Claude Code', async () => {
    const page = JSON.parse(await cliLine(['docs', 'mcp'], { HOME: home })) as { readonly ok: boolean; readonly data?: { readonly markdown: string } };

    expect(page.ok).toBe(true);
    expect(page.data?.markdown).toContain('claude mcp add --transport stdio --scope user panda-social -- panda-social mcp');
  });
});
