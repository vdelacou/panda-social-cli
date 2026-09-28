import type { CommandSpec } from '../command-spec.ts';
import { ID_OPTION, ON_OPTION, PROFILE_OPTION, CALL_ERRORS } from './shared-options.ts';

export const DELETE: CommandSpec = {
  name: 'delete',
  summary: 'Delete a Threads post by its id.',
  description:
    'Deletes one post from the account saved in the profile. Replies, the other parts of a --split thread included, are posts of their own: delete each id. Threads allows 100 deletes per 24 hours, and the token needs the threads_delete permission.',
  arguments: [],
  options: [ON_OPTION, ID_OPTION, PROFILE_OPTION],
  examples: [{ argv: ['delete', '--on', 'threads', '--id', '17890000000000001'], explanation: 'Delete one post from the default profile.' }],
  output: 'The deleted post: `{"platform":"threads","id":"<post id>","deleted":true}`.',
  mutates: true,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-post-id', 'invalid-profile', ...CALL_ERRORS],
};
