import { parseArgs } from 'node:util';
import { DEFAULT_PROFILE, parseProfileName } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';

export type Failure = {
  readonly code: string;
  readonly message: string;
  readonly hint: string;
};

// `profile` is absent when --profile is not given: the default profile applies.
export type PostCommand = {
  readonly command: 'post';
  readonly platform: 'threads';
  readonly text: string;
  readonly profile?: ProfileName;
};

export type SetupCommand = {
  readonly command: 'setup';
  readonly platform: 'threads';
  readonly profile: ProfileName;
  readonly tokenFromStdin: boolean;
};

export type CliCommand = PostCommand | SetupCommand;

const SUPPORTED_PLATFORMS: ReadonlyArray<string> = ['threads'];
const POST_EXAMPLE = 'panda-social post --to threads --text "Hello from panda"';
const SETUP_EXAMPLE = 'panda-social setup threads';

const readProfile = (value: unknown): Result<ProfileName | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseProfileName(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({
    code: 'invalid-profile',
    message: parsed.error.message,
    hint: 'Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a',
  });
};

// strict: false keeps parseArgs from throwing (try/catch stays out of the presenter,
// rule 17); a flag given without its value then arrives as `true`, never a string.
const parsePost = (args: ReadonlyArray<string>): Result<CliCommand, Failure> => {
  const { values } = parseArgs({
    args: [...args],
    options: { to: { type: 'string' }, text: { type: 'string' }, profile: { type: 'string' } },
    strict: false,
    allowPositionals: true,
  });
  if (typeof values.to !== 'string' || !SUPPORTED_PLATFORMS.includes(values.to)) {
    return err({
      code: 'unknown-platform',
      message: `Unknown platform: ${String(values.to)}.`,
      hint: `Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}. Example: ${POST_EXAMPLE}`,
    });
  }
  if (typeof values.text !== 'string' || values.text.length === 0)
    return err({ code: 'missing-text', message: 'The post has no text.', hint: `Pass the text with --text. Example: ${POST_EXAMPLE}` });
  const profile = readProfile(values.profile);
  if (!profile.ok) return profile;
  return ok({ command: 'post', platform: 'threads', text: values.text, ...(profile.value && { profile: profile.value }) });
};

const parseSetup = (args: ReadonlyArray<string>): Result<CliCommand, Failure> => {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: { 'token-stdin': { type: 'boolean' }, profile: { type: 'string' } },
    strict: false,
    allowPositionals: true,
  });
  const [platform = ''] = positionals;
  if (platform !== 'threads')
    return err({ code: 'unknown-platform', message: `No setup exists for "${platform}".`, hint: `Platforms with a setup: threads. Example: ${SETUP_EXAMPLE}` });
  const profile = readProfile(values.profile);
  if (!profile.ok) return profile;
  return ok({ command: 'setup', platform: 'threads', profile: profile.value ?? DEFAULT_PROFILE, tokenFromStdin: values['token-stdin'] === true });
};

const PARSERS: Readonly<Record<string, (args: ReadonlyArray<string>) => Result<CliCommand, Failure>>> = { post: parsePost, setup: parseSetup };

export const parseCliArgs = (argv: ReadonlyArray<string>): Result<CliCommand, Failure> => {
  const [command = '', ...rest] = argv;
  const parse = Object.hasOwn(PARSERS, command) ? PARSERS[command] : undefined;
  if (!parse) return err({ code: 'unknown-command', message: `Unknown command: "${command}".`, hint: `Commands: post, setup. Example: ${POST_EXAMPLE}` });
  return parse(rest);
};

export const renderSuccess = (data: unknown): string => JSON.stringify({ ok: true, data });

export const renderFailure = (failure: Failure): string => JSON.stringify({ ok: false, error: failure });
