import type { FacebookPageId } from '../domain/facebook-page.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { CommandName } from './command-spec.ts';
import type { DeleteCommand, Platform, PostCommand, UpdateCommand } from './post-command.ts';

// The platforms status takes: Instagram, before setup and posting do.
export type AccountPlatform = Platform | 'instagram';

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

// `pageId` is absent when --page is not given: the only Page the token grants is kept.
export type FacebookSetupCommand = {
  readonly command: 'setup';
  readonly platform: 'facebook';
  readonly profile: ProfileName;
  readonly tokenFromStdin: boolean;
  readonly pageId?: FacebookPageId;
};

export type SetupCommand = ThreadsSetupCommand | XSetupCommand | FacebookSetupCommand;

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

export type FacebookStatusCommand = {
  readonly command: 'status';
  readonly platform: 'facebook';
  readonly profile?: ProfileName;
};

export type InstagramStatusCommand = {
  readonly command: 'status';
  readonly platform: 'instagram';
  readonly profile?: ProfileName;
};

export type StatusCommand = ThreadsStatusCommand | XStatusCommand | FacebookStatusCommand | InstagramStatusCommand;

export type DocsCommand = { readonly command: 'docs'; readonly target: CommandName };

export type CliCommand =
  PostCommand | UpdateCommand | DeleteCommand | SetupCommand | StatusCommand | DocsCommand | { readonly command: 'help-json' } | { readonly command: 'version' };
