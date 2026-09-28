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

const EXPECTED_EXPORTS = ['createPublishPost', 'createThreadsGraph', 'createWinstonLogger', 'createXApi', 'err', 'ok', 'xTextLength'];
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
  results.push(report(`${runtime}: CLI answers without a token`, probeCli(runtime)), report(`${runtime}: library exports`, probeLibrary(runtime)));
}
process.exit(results.every(Boolean) ? 0 : 1);
