import { parseArgs } from 'node:util';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';

export type Failure = {
  readonly code: string;
  readonly message: string;
  readonly hint: string;
};

export type PostCommand = {
  readonly command: 'post';
  readonly platform: 'threads';
  readonly text: string;
};

const SUPPORTED_PLATFORMS: ReadonlyArray<string> = ['threads'];
const EXAMPLE = 'panda-social post --to threads --text "Hello from panda"';

// strict: false keeps parseArgs from throwing (try/catch stays out of the presenter,
// rule 17); a flag given without its value then arrives as `true`, never a string.
const readPostFlags = (args: ReadonlyArray<string>): { readonly to: unknown; readonly text: unknown } => {
  const { values } = parseArgs({ args: [...args], options: { to: { type: 'string' }, text: { type: 'string' } }, strict: false, allowPositionals: true });
  return { to: values.to, text: values.text };
};

const parsePost = (args: ReadonlyArray<string>): Result<PostCommand, Failure> => {
  const { to, text } = readPostFlags(args);
  if (typeof to !== 'string' || !SUPPORTED_PLATFORMS.includes(to)) {
    return err({ code: 'unknown-platform', message: `Unknown platform: ${String(to)}.`, hint: `Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}. Example: ${EXAMPLE}` });
  }
  if (typeof text !== 'string' || text.length === 0) return err({ code: 'missing-text', message: 'The post has no text.', hint: `Pass the text with --text. Example: ${EXAMPLE}` });
  return ok({ command: 'post', platform: 'threads', text });
};

export const parseCliArgs = (argv: ReadonlyArray<string>): Result<PostCommand, Failure> => {
  const [command = '', ...rest] = argv;
  if (command !== 'post') return err({ code: 'unknown-command', message: `Unknown command: "${command}".`, hint: `The only command so far is post. Example: ${EXAMPLE}` });
  return parsePost(rest);
};

export const renderSuccess = (data: unknown): string => JSON.stringify({ ok: true, data });

export const renderFailure = (failure: Failure): string => JSON.stringify({ ok: false, error: failure });
