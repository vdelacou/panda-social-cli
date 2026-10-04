import { PassThrough } from 'node:stream';
import type { CliIo } from '../composition/cli-io.ts';

// One JSON-RPC answer as a client reads it: the result of a request, or its error.
export type RpcAnswer = {
  readonly id: number;
  readonly result?: Readonly<Record<string, unknown>>;
  readonly error?: { readonly code: number; readonly message: string };
};

// A tool result: its text blocks joined, and whether the call failed.
export type ToolAnswer = {
  readonly text: string;
  readonly isError: boolean;
};

export type McpSession = {
  // The result of the handshake: the server name and version, and its instructions.
  readonly hello: Readonly<Record<string, unknown>>;
  readonly request: (method: string, params?: Readonly<Record<string, unknown>>) => Promise<RpcAnswer>;
  readonly callTool: (name: string, args?: Readonly<Record<string, unknown>>) => Promise<ToolAnswer>;
  // Every line written to stdout, in order: the server's and any the run printed itself.
  readonly stdoutLines: () => ReadonlyArray<string>;
  // Closes stdin, as a client does when it stops, and answers the exit code of the run.
  readonly close: () => Promise<number>;
};

type Run = (io: CliIo) => Promise<number>;

const parseLine = (line: string): RpcAnswer | undefined => {
  try {
    return JSON.parse(line) as RpcAnswer;
  } catch {
    return undefined;
  }
};

type TextBlock = { readonly type: string; readonly text?: string };

const toolAnswer = (answer: RpcAnswer): ToolAnswer => {
  if (answer.error) return { text: answer.error.message, isError: true };
  const content = (answer.result?.['content'] ?? []) as ReadonlyArray<TextBlock>;
  const text = content.map((block) => block.text ?? '').join('\n');
  return { text, isError: answer.result?.['isError'] === true };
};

// Speaks MCP to `panda-social mcp` as a client does: one JSON-RPC message per line on the
// server's stdin, each answer read back from stdout by its id. stdout is one stream, as in
// main.ts: the run's own printed lines land there too, so a stray one shows. Opening the
// session does the handshake.
export const openMcpSession = async (run: Run, env: Readonly<Record<string, string>>): Promise<McpSession> => {
  const input = new PassThrough();
  const output = new PassThrough();
  const lines: string[] = [];
  const waiting = new Map<number, (answer: RpcAnswer) => void>();
  let buffer = '';
  output.on('data', (chunk) => {
    buffer += String(chunk);
    for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      lines.push(line);
      const answer = parseLine(line);
      if (answer !== undefined) waiting.get(answer.id)?.(answer);
    }
  });
  const exit = run({
    argv: ['mcp'],
    env,
    writeOut: (line) => {
      output.write(`${line}\n`);
    },
    logStream: new PassThrough(),
    stdio: { input, output },
  });
  let nextId = 0;
  const request = async (method: string, params?: Readonly<Record<string, unknown>>): Promise<RpcAnswer> => {
    nextId += 1;
    const id = nextId;
    const answered = new Promise<RpcAnswer>((resolve) => waiting.set(id, resolve));
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params && { params }) })}\n`);
    return answered;
  };
  // A run that stops before the handshake (an unknown command, a crash) fails the test at once.
  const stopped = async (): Promise<RpcAnswer> => {
    const code = await exit;
    return { id: 0, error: { code, message: `panda-social mcp stopped before the handshake: ${lines.join(' | ')}` } };
  };
  const hello = await Promise.race([
    request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'panda-social-tests', version: '1.0.0' } }),
    stopped(),
  ]);
  if (hello.error) throw new Error(hello.error.message);
  input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  return {
    hello: hello.result ?? {},
    request,
    callTool: async (name, args = {}) => toolAnswer(await request('tools/call', { name, arguments: args })),
    stdoutLines: () => [...lines],
    close: async () => {
      input.end();
      return exit;
    },
  };
};
