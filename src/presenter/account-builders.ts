import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { exampleOf, withProfile } from './builder-helpers.ts';
import type { CliCommand } from './cli-command.ts';
import { THREADS_ONLY } from './commands/shared-options.ts';
import type { Failure } from './failure.ts';
import { readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';

// setup and status name their platform as an argument: `setup threads`, `status threads`.
const readAccountPlatform = (positionals: Flags['positionals'], command: 'setup' | 'status'): Result<'threads', Failure> => {
  const [platform = ''] = positionals;
  if (platform === 'threads') return ok(platform);
  return err({
    code: 'unknown-platform',
    message: `No ${command} exists for "${platform}".`,
    hint: `Platforms with a ${command}: ${THREADS_ONLY.join(', ')}. Example: ${exampleOf(command)}`,
  });
};

export const buildSetup = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readAccountPlatform(positionals, 'setup');
  if (!platform.ok) return platform;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'setup', platform: platform.value, profile: profile.value ?? DEFAULT_PROFILE, tokenFromStdin: values['token-stdin'] === true });
};

export const buildStatus = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const platform = readAccountPlatform(positionals, 'status');
  if (!platform.ok) return platform;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'status', platform: platform.value, ...withProfile(profile.value) });
};
