import type { ProfileName } from '../domain/profile-name.ts';
import type { CommandName } from './command-spec.ts';
import type { DeleteCommand, PostCommand, UpdateCommand } from './post-command.ts';

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
