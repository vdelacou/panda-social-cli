import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CliCommand } from './cli-command.ts';
import { buildSetup, buildStatus } from './account-builders.ts';
import { exampleOf, withProfile } from './builder-helpers.ts';
import { findCommand } from './command-registry.ts';
import { COMMAND_NAMES } from './command-spec.ts';
import type { CommandName } from './command-spec.ts';
import { didYouMean } from './did-you-mean.ts';
import type { Failure } from './failure.ts';
import type { Platform, PlatformContent, PostCommand, PostTarget } from './post-command.ts';
import { readContent, readFacebookContent, readThreadsContent, readXContent } from './post-content.ts';
import { readPlatform, readPlatforms, readPostId, readProfile } from './post-flags.ts';
import type { Flags } from './read-flags.ts';
import { BIN } from './usage.ts';

// Each builder turns the flags the registry accepted into one typed command.
export const unknownCommand = (message: string, typed: string): Failure => ({
  code: 'unknown-command',
  message,
  hint: `${didYouMean(typed, COMMAND_NAMES)}Commands: ${COMMAND_NAMES.join(', ')}. Run \`${BIN} help-json\` for all of them.`,
});

// Every platform's content is read before anything is posted (D38); in a list, a refusal
// names the platform that refused.
const readContents = (values: Flags['values'], platforms: ReadonlyArray<Platform>): Result<ReadonlyArray<PlatformContent>, Failure> => {
  const contents: PlatformContent[] = [];
  for (const platform of platforms) {
    const content = readContent(values, platform, exampleOf('post'));
    if (!content.ok) return platforms.length === 1 ? content : err({ ...content.error, message: `On ${platform}: ${content.error.message}` });
    contents.push(content.value);
  }
  return ok(contents);
};

// One platform posts as before; several make a cross-post, each with the same flags.
const buildPost = ({ values }: Flags): Result<CliCommand, Failure> => {
  const platforms = readPlatforms(values, exampleOf('post'));
  if (!platforms.ok) return platforms;
  const contents = readContents(values, platforms.value);
  if (!contents.ok) return contents;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  const posts = contents.value.map((content): PostCommand => ({ command: 'post', ...content, ...withProfile(profile.value) }));
  return ok(posts.length === 1 ? posts[0] : { command: 'cross-post', posts });
};

type Target = PostTarget & { readonly profile?: ProfileName };

// The post a delete or an update acts on: its platform, its id and the profile it belongs to.
const readTarget = ({ values }: Flags, example: string): Result<Target, Failure> => {
  const platform = readPlatform(values, example);
  if (!platform.ok) return platform;
  const id = readPostId(values['id'], platform.value);
  if (!id.ok) return id;
  const profile = readProfile(values['profile']);
  if (!profile.ok) return profile;
  return ok({ ...id.value, ...withProfile(profile.value) });
};

const buildDelete = (flags: Flags): Result<CliCommand, Failure> => {
  const target = readTarget(flags, exampleOf('delete'));
  return target.ok ? ok({ command: 'delete', ...target.value }) : target;
};

// The new content is read the way the target's platform takes it.
const buildUpdate = (flags: Flags): Result<CliCommand, Failure> => {
  const target = readTarget(flags, exampleOf('update'));
  if (!target.ok) return target;
  const repost = flags.values['repost'] === true;
  // Instagram Login edits nothing (D37): the update names its post and the answer is unsupported.
  if (target.value.platform === 'instagram') return ok({ command: 'update', ...target.value, repost });
  if (target.value.platform === 'x') {
    const content = readXContent(flags.values, exampleOf('update'));
    return content.ok ? ok({ command: 'update', ...target.value, ...content.value, repost }) : content;
  }
  if (target.value.platform === 'facebook') {
    const content = readFacebookContent(flags.values, exampleOf('update'));
    return content.ok ? ok({ command: 'update', ...target.value, ...content.value, repost }) : content;
  }
  const content = readThreadsContent(flags.values, exampleOf('update'));
  return content.ok ? ok({ command: 'update', ...target.value, ...content.value, repost }) : content;
};

const buildDocs = ({ positionals }: Flags): Result<CliCommand, Failure> => {
  const [target = ''] = positionals;
  const spec = findCommand(target);
  if (spec === undefined) return err(unknownCommand(target === '' ? 'Name the command to document.' : `No documentation for "${target}".`, target));
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
  mcp: () => ok({ command: 'mcp' }),
};
