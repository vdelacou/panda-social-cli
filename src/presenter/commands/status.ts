import type { CommandSpec } from '../command-spec.ts';
import { PROFILE_OPTION, THREADS_CALL_ERRORS, THREADS_ONLY } from './shared-options.ts';

export const STATUS: CommandSpec = {
  name: 'status',
  summary: 'Check a connected Threads account: whose token it is, how old it is, and how much of the 24-hour quotas is used.',
  description:
    'Asks Threads whose token the profile holds and reads its rolling 24-hour quotas for posts, replies and deletes. A saved token 30 days old or more is refreshed first, as every Threads command does, so running status now and then keeps an idle token alive: Threads lets a token lapse 60 days after its last refresh, and an expired one needs `panda-social setup threads` again. It never posts.',
  arguments: [{ name: 'platform', required: true, description: 'The platform to check.', values: THREADS_ONLY }],
  options: [PROFILE_OPTION],
  examples: [
    { argv: ['status', 'threads'], explanation: 'Check the account saved in the default profile.' },
    { argv: ['status', 'threads', '--profile', 'brand-a'], explanation: 'Check the account saved in the brand-a profile.' },
  ],
  output:
    'The account, its token and its quotas: `{"platform":"threads","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"token":{"source":"saved","savedAt":"<time>","ageDays":<n>,"expiresAt":"<time, or null until the first refresh>","refreshed":<true when this run refreshed it>},"limits":{"posts":{"used":<n>,"total":250,"windowSeconds":86400},"replies":{...},"deletes":{...}}}`. With PANDA_SOCIAL_THREADS_TOKEN set, `token` is `{"source":"environment"}`.',
  mutates: false,
  errors: ['unknown-option', 'unexpected-argument', 'unknown-platform', 'invalid-profile', ...THREADS_CALL_ERRORS],
};
