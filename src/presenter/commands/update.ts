import type { CommandSpec } from '../command-spec.ts';
import { ID_OPTION, IMAGE_OPTION, ON_OPTION, PROFILE_OPTION, PUBLISH_ERRORS, SPLIT_OPTION, TEXT_OPTION, CALL_ERRORS } from './shared-options.ts';

export const UPDATE: CommandSpec = {
  name: 'update',
  summary: 'Replace a Threads post. Threads has no edit, so --repost deletes it and publishes the new version.',
  description:
    'Threads cannot edit a published post, so update refuses unless --repost is given. With --repost it deletes the old post first, then publishes the new text or image as post does: the new post gets a new id and link, and the old one takes its likes and replies with it. If the delete fails, nothing is published; if the publish fails after the delete, the error says the old post is gone.',
  arguments: [],
  options: [
    ON_OPTION,
    ID_OPTION,
    TEXT_OPTION,
    PROFILE_OPTION,
    IMAGE_OPTION,
    SPLIT_OPTION,
    { name: 'repost', type: 'boolean', required: false, description: 'Delete the post and publish the new version. Without it, Threads updates are refused as unsupported.' },
  ],
  examples: [
    { argv: ['update', '--on', 'threads', '--id', '17890000000000001', '--text', 'Hello from panda, typo fixed', '--repost'], explanation: 'Replace a post with corrected text.' },
  ],
  output: 'The new post and the id it replaced: `{"platform":"threads","id":"<new id>","url":"<link or null>","replaced":"<old id>"}`, plus `"replies"` for a --split thread.',
  mutates: true,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-post-id', 'invalid-profile', 'unsupported', ...PUBLISH_ERRORS, ...CALL_ERRORS],
};
