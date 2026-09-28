import type { CommandSpec } from '../command-spec.ts';
import { CALL_ERRORS, PLATFORMS, PROFILE_OPTION } from './shared-options.ts';

export const STATUS: CommandSpec = {
  name: 'status',
  summary: 'Check a connected Threads or X account: whose credentials they are and whether they still work, with the Threads quotas.',
  description:
    'Asks the platform whose credentials the profile holds. For Threads it also reads the rolling 24-hour quotas for posts, replies and deletes, and a saved token 30 days old or more is refreshed first, as every Threads command does: running status now and then keeps an idle token alive, since Threads lets a token lapse 60 days after its last refresh. For X it reports the access level X states for the keys (null when X states none); X shows neither the credit balance nor the rate windows to these keys, and the check spends about $0.01 of X credits. It never posts.',
  arguments: [{ name: 'platform', required: true, description: 'The platform to check.', values: PLATFORMS }],
  options: [PROFILE_OPTION],
  examples: [
    { argv: ['status', 'threads'], explanation: 'Check the account saved in the default profile.' },
    { argv: ['status', 'threads', '--profile', 'brand-a'], explanation: 'Check the account saved in the brand-a profile.' },
    { argv: ['status', 'x'], explanation: 'Check the X keys saved in the default profile.' },
  ],
  output:
    'Threads: `{"platform":"threads","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"token":{"source":"saved","savedAt":"<time>","ageDays":<n>,"expiresAt":"<time, or null until the first refresh>","refreshed":<true when this run refreshed it>},"limits":{"posts":{"used":<n>,"total":250,"windowSeconds":86400},"replies":{...},"deletes":{...}}}`, with `token` `{"source":"environment"}` when PANDA_SOCIAL_THREADS_TOKEN is set. X: `{"platform":"x","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"accessLevel":"read-write","keys":{"source":"saved","savedAt":"<time>"}}`, with `keys` `{"source":"environment"}` when the four PANDA_SOCIAL_X_ variables are set.',
  mutates: false,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-profile', 'incomplete-environment', 'credits-depleted', ...CALL_ERRORS],
};
