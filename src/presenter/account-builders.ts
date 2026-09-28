import { parseFacebookPageId } from '../domain/facebook-page.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { exampleOf, withProfile } from './builder-helpers.ts';
import type { CliCommand } from './cli-command.ts';
import { PLATFORMS } from './commands/shared-options.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { Platform } from './post-command.ts';
import { isPlatform, readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';

// setup and status name their platform as an argument: `setup x`, `status threads`.
const readPlatform = (positionals: Flags['positionals'], command: 'setup' | 'status'): Result<Platform, Failure> => {
  const [platform = ''] = positionals;
  if (isPlatform(platform)) return ok(platform);
  return err({
    code: 'unknown-platform',
    message: `No ${command} exists for "${platform}".`,
    hint: `Platforms with a ${command}: ${PLATFORMS.join(', ')}. Example: ${exampleOf(command)}`,
  });
};

// Each platform reads its secret from standard input under its own flag.
const STDIN: Readonly<Record<Platform, { readonly flag: string; readonly other: string; readonly secret: string }>> = {
  threads: { flag: 'token-stdin', other: 'keys-stdin', secret: 'token' },
  x: { flag: 'keys-stdin', other: 'token-stdin', secret: 'keys' },
  facebook: { flag: 'token-stdin', other: 'keys-stdin', secret: 'token' },
  instagram: { flag: 'token-stdin', other: 'keys-stdin', secret: 'token' },
};

const refusedOption = (message: string): Failure => ({ code: 'unknown-option', message, hint: hintFor('unknown-option') });

// The other platform's stdin flag, and --page anywhere but Facebook, are refused by name.
const wrongFlag = (platform: Platform, values: Flags['values']): Failure | undefined => {
  const stdin = STDIN[platform];
  if (values[stdin.other] === true) return refusedOption(`\`setup ${platform}\` reads its ${stdin.secret} with --${stdin.flag}, not --${stdin.other}.`);
  if (platform !== 'facebook' && values['page'] !== undefined) return refusedOption('--page picks a Facebook Page: only `setup facebook` takes it.');
  return undefined;
};

// The --page of `setup facebook`: absent, or the digits of a Page id.
const readPageId = (value: unknown): Result<FacebookPageId | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseFacebookPageId(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({ code: 'invalid-page-id', message: parsed.error.message, hint: hintFor('invalid-page-id') });
};

const setupOf = (platform: Platform, profile: ProfileName, values: Flags['values']): Result<CliCommand, Failure> => {
  if (platform === 'x') return ok({ command: 'setup', platform: 'x', profile, keysFromStdin: values['keys-stdin'] === true });
  const tokenFromStdin = values['token-stdin'] === true;
  if (platform === 'threads' || platform === 'instagram') return ok({ command: 'setup', platform, profile, tokenFromStdin });
  const pageId = readPageId(values['page']);
  if (!pageId.ok) return pageId;
  return ok({ command: 'setup', platform: 'facebook', profile, tokenFromStdin, ...(pageId.value && { pageId: pageId.value }) });
};

export const buildSetup = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readPlatform(positionals, 'setup');
  if (!platform.ok) return platform;
  const wrong = wrongFlag(platform.value, values);
  if (wrong !== undefined) return err(wrong);
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return setupOf(platform.value, profile.value ?? DEFAULT_PROFILE, values);
};

export const buildStatus = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readPlatform(positionals, 'status');
  if (!platform.ok) return platform;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'status', platform: platform.value, ...withProfile(profile.value) });
};
