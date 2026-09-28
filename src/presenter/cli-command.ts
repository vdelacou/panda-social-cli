import type { ImageUrl } from '../domain/image-url.ts';
import type { ProfileName } from '../domain/profile-name.ts';
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

export type SetupCommand = {
  readonly command: 'setup';
  readonly platform: 'threads';
  readonly profile: ProfileName;
  readonly tokenFromStdin: boolean;
};

export type DocsCommand = { readonly command: 'docs'; readonly target: CommandName };

export type CliCommand = PostCommand | SetupCommand | DocsCommand | { readonly command: 'help-json' } | { readonly command: 'version' };
