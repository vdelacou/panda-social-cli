import type { CommandSpec } from '../command-spec.ts';
import { CALL_ERRORS, FACEBOOK_CALL_ERRORS, ID_OPTION, ON_OPTION, PROFILE_OPTION, X_CALL_ERRORS } from './shared-options.ts';

export const DELETE: CommandSpec = {
  name: 'delete',
  summary: 'Delete a Threads, X or Facebook post by its id.',
  description:
    'Deletes one post from the account saved in the profile. Replies, the other parts of a --split thread included, are posts of their own: delete each id. On X, deleting an edited post deletes every version of it. Threads allows 100 deletes per 24 hours and needs the threads_delete permission; X allows 50 per 15 minutes and bills $0.01 each. A Facebook post id is the Page id and the post number joined by an underscore, as post returned it. Instagram, connected through Instagram Login, cannot delete a post, so delete refuses there: delete it in the Instagram app.',
  arguments: [],
  options: [ON_OPTION, ID_OPTION, PROFILE_OPTION],
  examples: [
    { argv: ['delete', '--on', 'threads', '--id', '17890000000000001'], explanation: 'Delete one post from the default profile.' },
    { argv: ['delete', '--on', 'x', '--id', '1880000000000000001'], explanation: 'Delete one X post.' },
    { argv: ['delete', '--on', 'facebook', '--id', '104000000000001_122000000000001'], explanation: 'Delete one post from the Facebook Page.' },
  ],
  output: 'The deleted post: `{"platform":"<platform>","id":"<post id>","deleted":true}`.',
  mutates: true,
  errors: [
    'unknown-option',
    'unexpected-argument',
    'unknown-platform',
    'invalid-post-id',
    'invalid-profile',
    'unsupported',
    ...CALL_ERRORS,
    ...X_CALL_ERRORS,
    ...FACEBOOK_CALL_ERRORS,
  ],
};
