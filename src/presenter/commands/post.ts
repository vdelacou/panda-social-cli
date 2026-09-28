import type { CommandSpec } from '../command-spec.ts';
import { IMAGE_OPTION, PROFILE_OPTION, PUBLISH_ERRORS, SPLIT_OPTION, TEXT_OPTION, THREADS_CALL_ERRORS, THREADS_ONLY } from './shared-options.ts';

export const POST: CommandSpec = {
  name: 'post',
  summary: 'Publish a text post, an image, or both, to Threads.',
  description:
    'Publishes a new post on the account saved in the profile and answers with its id and link. A text over the limit is refused unless --split posts it as a thread of replies. Threads allows 250 posts per 24 hours. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.',
  arguments: [],
  options: [
    { name: 'to', type: 'string', placeholder: 'platform', required: true, description: 'The platform to post to.', values: THREADS_ONLY },
    TEXT_OPTION,
    PROFILE_OPTION,
    IMAGE_OPTION,
    SPLIT_OPTION,
  ],
  examples: [
    { argv: ['post', '--to', 'threads', '--text', 'Hello from panda'], explanation: 'Post from the account saved in the default profile.' },
    { argv: ['post', '--to', 'threads', '--text', 'Launch day', '--profile', 'brand-a'], explanation: 'Post from the account saved in the brand-a profile.' },
    { argv: ['post', '--to', 'threads', '--image', 'https://cdn.example.com/cat.jpg', '--text', 'A cat on the sofa'], explanation: 'Post an image with a caption.' },
    { argv: ['post', '--to', 'threads', '--text', 'Release notes that run past 500 characters', '--split'], explanation: 'Post a long text as a thread of replies.' },
  ],
  output: 'The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}`, plus `"replies":["<id>",...]` for a --split thread.',
  mutates: true,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-profile', ...PUBLISH_ERRORS, ...THREADS_CALL_ERRORS],
};
