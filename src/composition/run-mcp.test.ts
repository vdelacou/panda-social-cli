import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import packageJson from '../../package.json' with { type: 'json' };
import { openMcpSession } from '../test-helpers/mcp-session.ts';
import type { McpSession } from '../test-helpers/mcp-session.ts';
import { runCli } from './run-cli.ts';

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

describe('serving the commands to an MCP client with `panda-social mcp`', () => {
  let home = '';
  let session: McpSession | undefined;
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-mcp-'));
  });
  afterEach(async () => {
    await session?.close();
    session = undefined;
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
    it('get-command-docs gives the same page as `panda-social docs post`', async () => {
      session = await openMcpSession(runCli, { HOME: home });

      const answer = await session.callTool('get-command-docs', { command: 'post' });
      const cli = JSON.parse(await cliLine(['docs', 'post'], { HOME: home })) as { readonly data: { readonly markdown: string } };

      expect(answer).toEqual({ text: cli.data.markdown, isError: false });
    });
  });

  it('`panda-social docs mcp` gives the page with the command that registers the server in Claude Code', async () => {
    const page = JSON.parse(await cliLine(['docs', 'mcp'], { HOME: home })) as { readonly ok: boolean; readonly data?: { readonly markdown: string } };

    expect(page.ok).toBe(true);
    expect(page.data?.markdown).toContain('claude mcp add --transport stdio --scope user panda-social -- panda-social mcp');
  });
});
