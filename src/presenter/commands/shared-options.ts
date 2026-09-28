import type { OptionSpec } from '../command-spec.ts';

export const THREADS_ONLY: ReadonlyArray<string> = ['threads'];

export const PROFILE_OPTION: OptionSpec = {
  name: 'profile',
  type: 'string',
  placeholder: 'name',
  required: false,
  description: 'The profile whose saved account posts. Defaults to "default". PANDA_SOCIAL_THREADS_TOKEN, when set, overrides the saved token.',
};

// The failures any command that reaches Threads with a saved token can return.
export const THREADS_CALL_ERRORS: ReadonlyArray<string> = ['missing-credentials', 'corrupt', 'unreadable', 'unauthorized', 'rate-limited', 'rejected', 'network-failed', 'timeout'];
