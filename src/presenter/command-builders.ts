import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CliCommand } from './cli-command.ts';
import { COMMANDS, findCommand, specFor } from './command-registry.ts';
import type { CommandName } from './command-spec.ts';
import { SETUP_PLATFORMS } from './commands/setup.ts';
import type { Failure } from './failure.ts';
import { readContent, readPlatform, readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';
import { BIN, commandLine } from './usage.ts';

// Each builder turns the flags the registry accepted into one typed command.
const exampleOf = (name: CommandName): string => commandLine(specFor(name).examples[0]?.argv ?? [name]);

export const unknownCommand = (message: string): Failure => ({
  code: 'unknown-command',
  message,
  hint: `Commands: ${COMMANDS.map((command) => command.name).join(', ')}. Run \`${BIN} help-json\` for all of them.`,
});

const withProfile = (profile: ProfileName | undefined): { readonly profile?: ProfileName } => (profile ? { profile } : {});

const buildPost = ({ values }: Flags): Result<CliCommand, Failure> => {
  const platform = readPlatform(values, 'to', exampleOf('post'));
  if (!platform.ok) return platform;
  const content = readContent(values, exampleOf('post'));
  if (!content.ok) return content;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'post', platform: platform.value, ...content.value, ...withProfile(profile.value) });
};

const buildSetup = ({ values, positionals }: Flags): Result<CliCommand, Failure> => {
  const [platform = ''] = positionals;
  if (!SETUP_PLATFORMS.includes(platform)) {
    return err({
      code: 'unknown-platform',
      message: `No setup exists for "${platform}".`,
      hint: `Platforms with a setup: ${SETUP_PLATFORMS.join(', ')}. Example: ${exampleOf('setup')}`,
    });
  }
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'setup', platform: 'threads', profile: profile.value ?? DEFAULT_PROFILE, tokenFromStdin: values['token-stdin'] === true });
};

const buildDocs = ({ positionals }: Flags): Result<CliCommand, Failure> => {
  const [target = ''] = positionals;
  const spec = findCommand(target);
  if (spec === undefined) return err(unknownCommand(target === '' ? 'Name the command to document.' : `No documentation for "${target}".`));
  return ok({ command: 'docs', target: spec.name });
};

export const BUILDERS: Readonly<Record<CommandName, (flags: Flags) => Result<CliCommand, Failure>>> = {
  post: buildPost,
  setup: buildSetup,
  'help-json': () => ok({ command: 'help-json' }),
  docs: buildDocs,
};
