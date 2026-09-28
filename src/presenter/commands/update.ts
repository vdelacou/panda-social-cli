import type { CommandSpec } from '../command-spec.ts';
import {
  CALL_ERRORS,
  FACEBOOK_CALL_ERRORS,
  ID_OPTION,
  IMAGE_OPTION,
  ON_OPTION,
  PROFILE_OPTION,
  PUBLISH_ERRORS,
  SPLIT_OPTION,
  TEXT_OPTION,
  X_CALL_ERRORS,
} from './shared-options.ts';

export const UPDATE: CommandSpec = {
  name: 'update',
  summary: 'Replace a post: an edit in place on X and Facebook, or with --repost on Threads, X and Facebook, delete it and publish the new version.',
  description:
    'On X, update edits the post in place and answers the new version with the id it edited; X allows it with X Premium only, for a short window after posting (30 minutes or 1 hour, X pages differ) and 5 times at most, and one edited post stays one post, so the text must fit 280. On Facebook, update edits the text in place, for posts this app made, and answers the same id and link; an image cannot be edited there, so a new --image needs --repost. Threads cannot edit a published post, so there update refuses unless --repost is given. Instagram, connected through Instagram Login, can neither edit nor delete a post, so update refuses there, --repost included. With --repost, on Threads, X and Facebook, it deletes the old post first, then publishes the new text or image as post does: the new post gets a new id and link, and the old one takes its likes and replies with it. If the delete fails, nothing is published; if the publish fails after the delete, the error says the old post is gone.',
  arguments: [],
  options: [
    ON_OPTION,
    ID_OPTION,
    TEXT_OPTION,
    PROFILE_OPTION,
    IMAGE_OPTION,
    SPLIT_OPTION,
    {
      name: 'repost',
      type: 'boolean',
      required: false,
      description:
        'Delete the post and publish the new version instead of editing it. Required on Threads, which cannot edit, and for a new image on Facebook; on X and Facebook it replaces the edit.',
    },
  ],
  examples: [
    { argv: ['update', '--on', 'threads', '--id', '17890000000000001', '--text', 'Hello from panda, typo fixed', '--repost'], explanation: 'Replace a post with corrected text.' },
    { argv: ['update', '--on', 'x', '--id', '1880000000000000001', '--text', 'Hello from panda, typo fixed'], explanation: 'Edit an X post in place (X Premium).' },
    {
      argv: ['update', '--on', 'facebook', '--id', '104000000000001_122000000000001', '--text', 'Hello from panda, typo fixed'],
      explanation: 'Edit the text of a Page post in place.',
    },
  ],
  output:
    'The new post: `{"platform":"<platform>","id":"<new id>","url":"<link>","edited":"<old id>"}` after an edit on X, the same id in both after an edit on Facebook, or `"replaced":"<old id>"` in place of `edited` after a repost, plus `"replies"` for a --split thread.',
  mutates: true,
  errors: [
    'unknown-option',
    'unexpected-argument',
    'unknown-platform',
    'invalid-post-id',
    'invalid-profile',
    'unsupported',
    'edit-refused',
    ...PUBLISH_ERRORS,
    ...CALL_ERRORS,
    ...X_CALL_ERRORS,
    ...FACEBOOK_CALL_ERRORS,
  ],
};
