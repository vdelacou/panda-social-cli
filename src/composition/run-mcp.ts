import { Readable } from 'node:stream';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { renderFailure } from '../presenter/cli.ts';
import { renderCommandPage } from '../presenter/command-docs.ts';
import { findCommand } from '../presenter/command-registry.ts';
import { argvFor, commandForTool, listedCommands, MCP_INSTRUCTIONS, PARAM_TEXT, TOOL_TEXT } from '../presenter/mcp-tools.ts';
import type { Params, RunTool } from '../presenter/mcp-tools.ts';
import { BIN } from '../presenter/usage.ts';
import type { CliIo } from './cli-io.ts';
import { PACKAGE_VERSION } from './package-info.ts';

type RunCli = (io: CliIo) => Promise<number>;

const textResult = (text: string, failed = false): CallToolResult => ({ content: [{ type: 'text', text }], ...(failed && { isError: true }) });

// One run of the CLI inside the server, with no stdin, no terminal and no stdio: a run here
// cannot read the protocol stream, prompt, or print to stdout (D50, D53). Its one JSON line
// is the tool result, an error when the run failed.
const runOnce = async (io: CliIo, runCli: RunCli, argv: ReadonlyArray<string>): Promise<CallToolResult> => {
  const lines: string[] = [];
  const exitCode = await runCli({
    argv,
    env: io.env,
    writeOut: (line) => {
      lines.push(line);
    },
    logStream: io.logStream,
  });
  return textResult(lines.join('\n'), exitCode !== 0);
};

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

type RunInput = { readonly command: string; readonly params?: Params };

// A run tool: the gate first, so a command of the other tool never runs (D49), then the run.
const runTool = async (io: CliIo, runCli: RunCli, tool: RunTool, { command, params }: RunInput): Promise<CallToolResult> => {
  const spec = commandForTool(tool, command);
  return spec.ok ? runOnce(io, runCli, argvFor(spec.value, params ?? {})) : textResult(renderFailure(spec.error), true);
};

// `panda-social mcp` (D49 to D53): the SDK loads here only, so the other commands do not wait
// for it. The server stops when the client closes stdin.
export const runMcp = async (io: CliIo, runCli: RunCli): Promise<number> => {
  const { McpServer } = await import('@modelcontextprotocol/server');
  const { StdioServerTransport } = await import('@modelcontextprotocol/server/stdio');
  const { z } = await import('zod');
  const server = new McpServer({ name: BIN, version: PACKAGE_VERSION }, { instructions: MCP_INSTRUCTIONS });
  // A number is not a valid value: a post id in a JSON number can lose digits (D50).
  const paramValue = z.union([z.string(), z.boolean()]);
  const params = z.record(z.string(), paramValue).optional().describe(PARAM_TEXT.params);
  const runInput = z.object({ command: z.string().describe(PARAM_TEXT.command), params });

  server.registerTool('list-commands', { ...TOOL_TEXT['list-commands'], annotations: READ_ONLY }, async (): Promise<CallToolResult> =>
    textResult(JSON.stringify({ commands: listedCommands() }))
  );
  server.registerTool(
    'get-command-docs',
    { ...TOOL_TEXT['get-command-docs'], inputSchema: z.object({ command: z.string().describe(PARAM_TEXT.docsCommand) }), annotations: READ_ONLY },
    async ({ command }): Promise<CallToolResult> => {
      const spec = findCommand(command);
      return spec ? textResult(renderCommandPage(spec)) : runOnce(io, runCli, ['docs', command]);
    }
  );
  server.registerTool(
    'get-setup-guide',
    {
      ...TOOL_TEXT['get-setup-guide'],
      inputSchema: z.object({ platform: z.string().describe(PARAM_TEXT.platform), profile: z.string().optional().describe(PARAM_TEXT.profile) }),
      annotations: READ_ONLY,
    },
    async ({ platform, profile }): Promise<CallToolResult> => runOnce(io, runCli, ['setup', platform, ...(profile === undefined ? [] : [`--profile=${profile}`])])
  );
  server.registerTool(
    'run-command',
    { ...TOOL_TEXT['run-command'], inputSchema: runInput, annotations: { readOnlyHint: true, openWorldHint: true } },
    async (input): Promise<CallToolResult> => runTool(io, runCli, 'run-command', input)
  );
  server.registerTool(
    'run-write-command',
    { ...TOOL_TEXT['run-write-command'], inputSchema: runInput, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true } },
    async (input): Promise<CallToolResult> => runTool(io, runCli, 'run-write-command', input)
  );

  // Only main.ts gives the streams of the process. Without them there is no client: the
  // server reads an empty input and stops at once.
  const streams = io.stdio ?? { input: Readable.from([]), output: io.logStream };
  const ended = new Promise<void>((resolve) => {
    streams.input.once('end', resolve);
  });
  await server.connect(new StdioServerTransport(streams.input, streams.output));
  await ended;
  await server.close();
  return 0;
};
