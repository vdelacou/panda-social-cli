#!/usr/bin/env bun
/*
 * Package smoke: the built dist/ must run the same under Bun and under Node 20+,
 * because the published package promises both (`engines`). `bun test` runs the
 * sources and can never see a bundling or runtime-interop break; this runs the
 * artifact itself.
 *
 *   bun run build && bun run smoke:dist
 *
 * Node is the published CLI's own runtime here, not the toolchain (rule 5): it
 * is only spawned against the built artifact. Where Node is absent the check
 * says so and runs Bun alone.
 */

type Probe = { readonly ok: boolean; readonly detail: string };

const EXPECTED_EXPORTS = [
  'createFacebookGraph',
  'createInstagramGraph',
  'createPublishPost',
  'createThreadsGraph',
  'createWinstonLogger',
  'createXApi',
  'err',
  'ok',
  'xTextLength',
];
const LIBRARY_PROBE = "const m = await import('./dist/index.js'); process.stdout.write(JSON.stringify(Object.keys(m).sort()));";

const run = (command: ReadonlyArray<string>, env: Record<string, string>): { readonly code: number; readonly stdout: string } => {
  const proc = Bun.spawnSync([...command], { env, stdout: 'pipe', stderr: 'pipe' });
  return { code: proc.exitCode ?? 1, stdout: proc.stdout.toString() };
};

// No token in the environment and a throwaway HOME: the CLI must answer with its
// missing-credentials envelope and exit 1, whatever machine runs the smoke.
const cleanEnv = (): Record<string, string> => ({ PATH: process.env['PATH'] ?? '', HOME: '/nonexistent-panda-home' });

const probeCli = (runtime: string): Probe => {
  const { code, stdout } = run([runtime, 'dist/cli.js', 'post', '--to', 'threads', '--text', 'smoke'], cleanEnv());
  const answeredMissingCredentials = code === 1 && stdout.includes('"code":"missing-credentials"');
  return { ok: answeredMissingCredentials, detail: `exit ${code}, stdout ${stdout.trim().slice(0, 120)}` };
};

const probeLibrary = (runtime: string): Probe => {
  const args = runtime === 'node' ? ['node', '--input-type=module', '-e', LIBRARY_PROBE] : ['bun', '-e', LIBRARY_PROBE];
  const { code, stdout } = run(args, cleanEnv());
  const exported = EXPECTED_EXPORTS.every((name) => stdout.includes(`"${name}"`));
  return { ok: code === 0 && exported, detail: `exit ${code}, exports ${stdout.trim()}` };
};

// MCP (D53): the built server answers a client, and its stdout holds only JSON-RPC messages.
// One stray line there stops a real client, and no in-process test sees the bundle's own
// wiring of stdin and stdout. Like a client, the probe waits for its last answer before it
// closes stdin.
const MCP_SESSION = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'smoke', version: '1.0.0' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list-commands', arguments: {} } },
];
const MCP_TOOLS = 'list-commands,get-command-docs,get-setup-guide,run-command,run-write-command';
const MCP_DEADLINE_MS = 15_000;

type Frame = { readonly jsonrpc?: string; readonly id?: number; readonly result?: { readonly tools?: ReadonlyArray<{ readonly name: string }> } };

const frameOf = (line: string): Frame | undefined => {
  try {
    return JSON.parse(line) as Frame;
  } catch {
    return undefined;
  }
};

const answeredLast = (text: string): boolean => text.split('\n').some((line) => frameOf(line)?.id === 3);

// Reads stdout until it ends, and closes stdin once the last answer is in, as a client does.
const readSession = async (stdout: ReadableStream<Uint8Array>, closeStdin: () => Promise<unknown>): Promise<string> => {
  const reader = stdout.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let closed = false;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    text += decoder.decode(chunk.value, { stream: true });
    if (closed || !answeredLast(text)) continue;
    closed = true;
    await closeStdin();
  }
  return text;
};

// The session passes when the server exits 0, writes only JSON-RPC, lists the five tools and
// answers list-commands.
const judgeSession = (text: string, code: number): Probe => {
  const lines = text.split('\n').filter((line) => line !== '');
  const frames = lines.map((line) => frameOf(line));
  const onlyJsonRpc = frames.every((frame) => frame?.jsonrpc === '2.0');
  const tools = (frames.find((frame) => frame?.id === 2)?.result?.tools ?? []).map((tool) => tool.name).join(',');
  const listed = frames.some((frame) => frame?.id === 3 && frame.result !== undefined);
  return { ok: code === 0 && onlyJsonRpc && tools === MCP_TOOLS && listed, detail: `exit ${code}, ${lines.length} lines, only JSON-RPC ${onlyJsonRpc}, tools ${tools}` };
};

// The deadline stops a server that hangs: its stdout then ends, and so does the probe.
const probeMcp = async (runtime: string): Promise<Probe> => {
  const proc = Bun.spawn([runtime, 'dist/cli.js', 'mcp'], { env: cleanEnv(), stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  const timer = setTimeout(() => {
    proc.kill();
  }, MCP_DEADLINE_MS);
  for (const message of MCP_SESSION) proc.stdin.write(`${JSON.stringify(message)}\n`);
  await proc.stdin.flush();
  const text = await readSession(proc.stdout, async () => proc.stdin.end());
  const code = await proc.exited;
  clearTimeout(timer);
  return judgeSession(text, code);
};

const report = (label: string, probe: Probe): boolean => {
  console.log(`${probe.ok ? 'ok  ' : 'FAIL'} ${label}: ${probe.detail}`);
  return probe.ok;
};

const cli = await Bun.file('dist/cli.js').text();
const shebangOk = cli.startsWith('#!/usr/bin/env node\n');
const results = [report('dist/cli.js starts with the node shebang', { ok: shebangOk, detail: shebangOk ? 'present' : 'missing' })];
const runtimes = ['bun', ...(Bun.which('node') ? ['node'] : [])];
if (runtimes.length === 1) console.log('warn node is not on PATH: the Node half of the smoke did not run, which is not a pass');
for (const runtime of runtimes) {
  results.push(
    report(`${runtime}: CLI answers without a token`, probeCli(runtime)),
    report(`${runtime}: library exports`, probeLibrary(runtime)),
    report(`${runtime}: mcp answers a client with JSON-RPC only`, await probeMcp(runtime))
  );
}
process.exit(results.every(Boolean) ? 0 : 1);
