import { err } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { InstagramPublishError } from './publish-instagram-post.ts';

// D37: Instagram Login can neither delete nor edit a post, and with no delete there is no
// repost either, so both stop here, before any credential is read or Instagram is asked.
const REFUSALS: Readonly<Record<'delete' | 'update', string>> = {
  delete: 'Instagram Login cannot delete a post.',
  update: 'Instagram Login can neither edit a post nor delete it to publish it again.',
};

export const refuseInstagramChange = (step: 'delete' | 'update'): Result<never, InstagramPublishError> =>
  err({ step, platform: 'instagram', cause: 'unsupported', message: REFUSALS[step] });
