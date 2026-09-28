import type { OptionSpec } from '../command-spec.ts';

// The platforms every command takes.
export const PLATFORMS: ReadonlyArray<string> = ['threads', 'x'];

export const PROFILE_OPTION: OptionSpec = {
  name: 'profile',
  type: 'string',
  placeholder: 'name',
  required: false,
  description:
    'The profile whose saved account acts. Defaults to "default". A saved Threads token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables, when set, override the saved credentials.',
};

export const TEXT_OPTION: OptionSpec = {
  name: 'text',
  type: 'string',
  placeholder: 'text',
  required: false,
  description:
    'The text of the post, quoted when it contains spaces. Required unless --image is given. Threads takes 500 characters, an emoji counting its UTF-8 bytes (a thumbs-up is 4); X takes 280 as X counts them: most characters 1, CJK characters and emoji 2, a link 23.',
};

export const IMAGE_OPTION: OptionSpec = {
  name: 'image',
  type: 'string',
  placeholder: 'image',
  required: false,
  description:
    'Threads: a public https URL to a JPEG or PNG image, 8 MB at most, which Threads downloads itself. X: a local JPEG, PNG, GIF or WEBP file, 5 MB at most, which the CLI uploads.',
};

export const SPLIT_OPTION: OptionSpec = {
  name: 'split',
  type: 'boolean',
  required: false,
  description: 'Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted.',
};

export const ON_OPTION: OptionSpec = { name: 'on', type: 'string', placeholder: 'platform', required: true, description: 'The platform the post is on.', values: PLATFORMS };

export const ID_OPTION: OptionSpec = { name: 'id', type: 'string', placeholder: 'post-id', required: true, description: 'The numeric id of the post, as post returned it.' };

// The failures any command that reaches a platform with saved credentials can return.
export const CALL_ERRORS: ReadonlyArray<string> = [
  'missing-credentials',
  'corrupt',
  'unreadable',
  'unauthorized',
  'forbidden',
  'rate-limited',
  'rejected',
  'network-failed',
  'timeout',
];

// What X adds: keys set only partly in the environment, credits used up, keys that cannot post.
export const X_CALL_ERRORS: ReadonlyArray<string> = ['incomplete-environment', 'credits-depleted', 'read-only-keys'];

export const PUBLISH_ERRORS: ReadonlyArray<string> = ['missing-text', 'invalid-image', 'text-too-long', 'image-rejected', 'still-processing', 'duplicate-text'];
