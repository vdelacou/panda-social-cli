import type { CommandSpec } from '../command-spec.ts';

export const POST_PLATFORMS: ReadonlyArray<string> = ['threads'];

export const POST: CommandSpec = {
  name: 'post',
  summary: 'Publish a text post to Threads.',
  description:
    'Publishes the text as a new post on the account saved in the profile, and answers with the post id and its link. Threads allows 500 characters and 250 posts per 24 hours. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.',
  arguments: [],
  options: [
    { name: 'to', type: 'string', placeholder: 'platform', required: true, description: 'The platform to post to.', values: POST_PLATFORMS },
    { name: 'text', type: 'string', placeholder: 'text', required: true, description: 'The text of the post, quoted when it contains spaces. 500 characters at most on Threads.' },
    {
      name: 'profile',
      type: 'string',
      placeholder: 'name',
      required: false,
      description: 'The profile whose saved account posts. Defaults to "default". PANDA_SOCIAL_THREADS_TOKEN, when set, overrides the saved token.',
    },
  ],
  examples: [
    { argv: ['post', '--to', 'threads', '--text', 'Hello from panda'], explanation: 'Post from the account saved in the default profile.' },
    { argv: ['post', '--to', 'threads', '--text', 'Launch day', '--profile', 'brand-a'], explanation: 'Post from the account saved in the brand-a profile.' },
  ],
  output: 'The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}`.',
  mutates: true,
  errors: [
    'unknown-option',
    'unexpected-argument',
    'unknown-platform',
    'missing-text',
    'invalid-profile',
    'missing-credentials',
    'corrupt',
    'unreadable',
    'unauthorized',
    'rate-limited',
    'rejected',
    'network-failed',
    'timeout',
  ],
};
