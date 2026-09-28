import type { ImageUrl } from '../domain/image-url.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { CommandName } from './command-spec.ts';

// What a post carries; each key is absent rather than empty when its flag is not given.
export type PostContent = {
  readonly text?: string;
  readonly imageUrl?: ImageUrl;
  readonly split?: true;
};

// `profile` is absent when --profile is not given: the default profile applies.
export type PostCommand = PostContent & {
  readonly command: 'post';
  readonly platform: 'threads';
  readonly profile?: ProfileName;
};

export type DeleteCommand = {
  readonly command: 'delete';
  readonly platform: 'threads';
  readonly id: ThreadsPostId;
  readonly profile?: ProfileName;
};

export type UpdateCommand = PostContent & {
  readonly command: 'update';
  readonly platform: 'threads';
  readonly id: ThreadsPostId;
  readonly repost: boolean;
  readonly profile?: ProfileName;
};

export type ThreadsSetupCommand = {
  readonly command: 'setup';
  readonly platform: 'threads';
  readonly profile: ProfileName;
  readonly tokenFromStdin: boolean;
};

export type XSetupCommand = {
  readonly command: 'setup';
  readonly platform: 'x';
  readonly profile: ProfileName;
  readonly keysFromStdin: boolean;
};

export type SetupCommand = ThreadsSetupCommand | XSetupCommand;

// `profile` is absent when --profile is not given: the default profile applies.
export type ThreadsStatusCommand = {
  readonly command: 'status';
  readonly platform: 'threads';
  readonly profile?: ProfileName;
};

export type XStatusCommand = {
  readonly command: 'status';
  readonly platform: 'x';
  readonly profile?: ProfileName;
};

export type StatusCommand = ThreadsStatusCommand | XStatusCommand;

export type DocsCommand = { readonly command: 'docs'; readonly target: CommandName };

export type CliCommand =
  PostCommand | UpdateCommand | DeleteCommand | SetupCommand | StatusCommand | DocsCommand | { readonly command: 'help-json' } | { readonly command: 'version' };
