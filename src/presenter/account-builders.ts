import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { exampleOf, withProfile } from './builder-helpers.ts';
import type { CliCommand } from './cli-command.ts';
import { PLATFORMS } from './commands/shared-options.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import { readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';

// setup and status name their platform as an argument: `setup x`, `status threads`.
const readAccountPlatform = (positionals: Flags['positionals'], command: 'setup' | 'status'): Result<'threads' | 'x', Failure> => {
  const [platform = ''] = positionals;
  if (platform === 'threads' || platform === 'x') return ok(platform);
  return err({
    code: 'unknown-platform',
    message: `No ${command} exists for "${platform}".`,
    hint: `Platforms with a ${command}: ${PLATFORMS.join(', ')}. Example: ${exampleOf(command)}`,
  });
};

// Each platform reads its secret from standard input under its own flag.
const wrongStdinFlag = (platform: 'threads' | 'x', values: Flags['values']): Failure | undefined => {
  if (platform === 'x' && values['token-stdin'] === true)
    return { code: 'unknown-option', message: '`setup x` reads its keys with --keys-stdin, not --token-stdin.', hint: hintFor('unknown-option') };
  if (platform === 'threads' && values['keys-stdin'] === true)
    return { code: 'unknown-option', message: '`setup threads` reads its token with --token-stdin, not --keys-stdin.', hint: hintFor('unknown-option') };
  return undefined;
};

export const buildSetup = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readAccountPlatform(positionals, 'setup');
  if (!platform.ok) return platform;
  const wrongFlag = wrongStdinFlag(platform.value, values);
  if (wrongFlag !== undefined) return err(wrongFlag);
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  const chosen = profile.value ?? DEFAULT_PROFILE;
  if (platform.value === 'x') return ok({ command: 'setup', platform: 'x', profile: chosen, keysFromStdin: values['keys-stdin'] === true });
  return ok({ command: 'setup', platform: 'threads', profile: chosen, tokenFromStdin: values['token-stdin'] === true });
};

export const buildStatus = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readAccountPlatform(positionals, 'status');
  if (!platform.ok) return platform;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'status', platform: platform.value, ...withProfile(profile.value) });
};
