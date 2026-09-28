import type { CommandSpec } from '../command-spec.ts';
import { CALL_ERRORS, IMAGE_OPTION, PLATFORMS, PROFILE_OPTION, PUBLISH_ERRORS, SPLIT_OPTION, TEXT_OPTION, X_CALL_ERRORS } from './shared-options.ts';

export const POST: CommandSpec = {
  name: 'post',
  summary: 'Publish a text post, an image, or both, to Threads or X.',
  description:
    'Publishes a new post on the account saved in the profile and answers with its id and link. A text over the platform limit (500 on Threads, 280 on X) is refused unless --split posts it as a thread of replies. Threads downloads the image from its URL; on X the CLI uploads a local file. Threads allows 250 posts per 24 hours; X allows 100 per 15 minutes and bills each one against the app credits, $0.015, or $0.20 when the text contains a link. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.',
  arguments: [],
  options: [
    { name: 'to', type: 'string', placeholder: 'platform', required: true, description: 'The platform to post to.', values: PLATFORMS },
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
    { argv: ['post', '--to', 'x', '--text', 'Hello from panda'], explanation: 'Post to X from the keys saved in the default profile.' },
    { argv: ['post', '--to', 'x', '--image', './chart.png', '--text', 'This week in one chart'], explanation: 'Upload a local image to X with a caption.' },
  ],
  output:
    'The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}` on Threads, `{"platform":"x","id":"<post id>","url":"https://x.com/i/status/<post id>"}` on X, plus `"replies":["<id>",...]` for a --split thread.',
  mutates: true,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-profile', ...PUBLISH_ERRORS, ...CALL_ERRORS, ...X_CALL_ERRORS],
};
