import type { OptionSpec } from '../command-spec.ts';

export const THREADS_ONLY: ReadonlyArray<string> = ['threads'];

export const PROFILE_OPTION: OptionSpec = {
  name: 'profile',
  type: 'string',
  placeholder: 'name',
  required: false,
  description:
    'The profile whose saved account acts. Defaults to "default". A saved token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, when set, overrides the saved token.',
};

export const TEXT_OPTION: OptionSpec = {
  name: 'text',
  type: 'string',
  placeholder: 'text',
  required: false,
  description:
    'The text of the post, quoted when it contains spaces. Required unless --image is given. 500 characters at most on Threads, an emoji counting its UTF-8 bytes (a thumbs-up is 4).',
};

export const IMAGE_OPTION: OptionSpec = {
  name: 'image',
  type: 'string',
  placeholder: 'url',
  required: false,
  description: 'A public https URL to a JPEG or PNG image, 8 MB at most. Threads downloads it itself, so a local file must be hosted first.',
};

export const SPLIT_OPTION: OptionSpec = {
  name: 'split',
  type: 'boolean',
  required: false,
  description: 'Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted.',
};

export const ON_OPTION: OptionSpec = { name: 'on', type: 'string', placeholder: 'platform', required: true, description: 'The platform the post is on.', values: THREADS_ONLY };

export const ID_OPTION: OptionSpec = { name: 'id', type: 'string', placeholder: 'post-id', required: true, description: 'The numeric id of the post, as post returned it.' };

// The failures any command that reaches Threads with a saved token can return.
export const THREADS_CALL_ERRORS: ReadonlyArray<string> = [
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

export const PUBLISH_ERRORS: ReadonlyArray<string> = ['missing-text', 'invalid-image', 'text-too-long', 'image-rejected', 'still-processing'];
