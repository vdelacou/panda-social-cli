import type { ProfileName } from '../domain/profile-name.ts';
import type { CommandName } from './command-spec.ts';

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

export type DocsCommand = { readonly command: 'docs'; readonly target: CommandName };

export type CliCommand = PostCommand | SetupCommand | DocsCommand | { readonly command: 'help-json' } | { readonly command: 'version' };
