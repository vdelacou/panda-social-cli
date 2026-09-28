import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { CliCommand } from './cli-command.ts';
import { buildSetup, buildStatus } from './account-builders.ts';
import { exampleOf, withProfile } from './builder-helpers.ts';
import { COMMANDS, findCommand } from './command-registry.ts';
import type { CommandName } from './command-spec.ts';
import type { Failure } from './failure.ts';
import { readContent, readPlatform, readPostId, readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';
import { BIN } from './usage.ts';

// Each builder turns the flags the registry accepted into one typed command.
export const unknownCommand = (message: string): Failure => ({
  code: 'unknown-command',
  message,
  hint: `Commands: ${COMMANDS.map((command) => command.name).join(', ')}. Run \`${BIN} help-json\` for all of them.`,
});

const buildPost = ({ values }: Flags): Result<CliCommand, Failure> => {
  const platform = readPlatform(values, 'to', exampleOf('post'));
  if (!platform.ok) return platform;
  const content = readContent(values, exampleOf('post'));
  if (!content.ok) return content;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ command: 'post', platform: platform.value, ...content.value, ...withProfile(profile.value) });
};

type Target = { readonly platform: 'threads'; readonly id: ThreadsPostId; readonly profile?: ProfileName };

// The post a delete or an update acts on: its platform, its id and the profile it belongs to.
const readTarget = ({ values }: Flags, example: string): Result<Target, Failure> => {
  const platform = readPlatform(values, 'on', example);
  if (!platform.ok) return platform;
  const id = readPostId(values['id']);
  if (!id.ok) return id;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ platform: platform.value, id: id.value, ...withProfile(profile.value) });
};

const buildDelete = (flags: Flags): Result<CliCommand, Failure> => {
  const target = readTarget(flags, exampleOf('delete'));
  return target.ok ? ok({ command: 'delete', ...target.value }) : target;
};

const buildUpdate = (flags: Flags): Result<CliCommand, Failure> => {
  const target = readTarget(flags, exampleOf('update'));
  if (!target.ok) return target;
  const content = readContent(flags.values, exampleOf('update'));
  if (!content.ok) return content;
  return ok({ command: 'update', ...target.value, ...content.value, repost: flags.values['repost'] === true });
};

const buildDocs = ({ positionals }: Flags): Result<CliCommand, Failure> => {
  const [target = ''] = positionals;
  const spec = findCommand(target);
  if (spec === undefined) return err(unknownCommand(target === '' ? 'Name the command to document.' : `No documentation for "${target}".`));
  return ok({ command: 'docs', target: spec.name });
};

export const BUILDERS: Readonly<Record<CommandName, (flags: Flags) => Result<CliCommand, Failure>>> = {
  post: buildPost,
  update: buildUpdate,
  delete: buildDelete,
  setup: buildSetup,
  status: buildStatus,
  'help-json': () => ok({ command: 'help-json' }),
  docs: buildDocs,
};
