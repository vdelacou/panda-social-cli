// The built CLI, run as the user runs it, one command at a time, and the one JSON line it answers.

export type Answer =
  | { readonly ok: true; readonly data: Readonly<Record<string, unknown>>; readonly stderr: string }
  | { readonly ok: false; readonly code: string; readonly message: string; readonly stderr: string };

export type RunOptions = {
  // Another HOME, so the CLI reads and writes a throwaway credentials file (the renewal, D44).
  readonly home?: string;
  // Standard input for `setup <platform> --token-stdin`: a token never goes into argv.
  readonly stdin?: string;
  // Variables to leave out, so a token from the environment cannot stand in for the saved one.
  readonly without?: ReadonlyArray<string>;
};

export type Runner = (args: ReadonlyArray<string>, options?: RunOptions) => Answer;

// A post waits up to a minute for its container, and a --split thread posts several in turn.
const COMMAND_TIMEOUT_MS = 300_000;

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null;

// A nested field of an answer, or undefined when the path is not there; an array index is a key too.
export const pick = (value: unknown, ...keys: ReadonlyArray<string>): unknown => keys.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value);

export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const answerOf = (stdout: string, stderr: string): Answer => {
  const envelope = parseJson(stdout.trim().split('\n').at(-1) ?? '');
  const data = pick(envelope, 'data');
  if (pick(envelope, 'ok') === true && isRecord(data)) return { ok: true, data, stderr };
  const code = pick(envelope, 'error', 'code');
  if (typeof code === 'string') return { ok: false, code, message: String(pick(envelope, 'error', 'message')), stderr };
  return { ok: false, code: 'no-answer', message: `the CLI printed no JSON answer; stderr ends: ${stderr.trim().slice(-300)}`, stderr };
};

const environment = (options: RunOptions | undefined): Record<string, string> => {
  const left = new Set(options?.without);
  const kept = Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined && !left.has(entry[0]));
  return { ...Object.fromEntries(kept), ...(options?.home !== undefined && { HOME: options.home }) };
};

// `node dist/cli.js ...` (or bun), with --profile on every command when the run names one.
export const createRunner =
  (runtime: string, profile: string | undefined): Runner =>
  (args, options) => {
    const profileArgs = profile === undefined ? [] : ['--profile', profile];
    const ran = Bun.spawnSync([runtime, 'dist/cli.js', ...args, ...profileArgs], {
      env: environment(options),
      stdin: options?.stdin === undefined ? 'ignore' : Buffer.from(options.stdin),
      timeout: COMMAND_TIMEOUT_MS,
    });
    return answerOf(ran.stdout.toString(), ran.stderr.toString());
  };
