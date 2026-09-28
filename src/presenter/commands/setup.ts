import type { CommandSpec } from '../command-spec.ts';
import { ACCOUNT_PLATFORMS } from './shared-options.ts';

export const SETUP: CommandSpec = {
  name: 'setup',
  summary: 'Connect a Threads or X account and save its credentials under a profile.',
  description:
    'On a terminal, walks a first-time user through the one-time steps of the platform (six for Threads, five for X) one at a time, then reads the Threads token or the four X keys without showing them. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin (Threads) or --keys-stdin (X, four lines: API Key, API Key Secret, Access Token, Access Token Secret) it reads them from standard input. The credentials are checked with the platform before they are saved in ~/.panda-social/credentials.json, readable by its owner only; X keys that X reports as read-only are refused. Checking X keys spends about $0.01 of X credits.',
  arguments: [{ name: 'platform', required: true, description: 'The platform to connect.', values: ACCOUNT_PLATFORMS }],
  options: [
    { name: 'token-stdin', type: 'boolean', required: false, description: 'Threads: read the token from standard input instead of asking for it.' },
    {
      name: 'keys-stdin',
      type: 'boolean',
      required: false,
      description: 'X: read the four keys from standard input, one per line: API Key, API Key Secret, Access Token, Access Token Secret.',
    },
    { name: 'profile', type: 'string', placeholder: 'name', required: false, description: 'The profile to save the account under. Defaults to "default".' },
  ],
  examples: [
    { argv: ['setup', 'threads'], explanation: 'On a terminal, the guided setup; without one, the steps as JSON.' },
    { argv: ['setup', 'threads', '--token-stdin'], explanation: 'Save a token piped in on standard input, once Threads confirms it.' },
    { argv: ['setup', 'threads', '--token-stdin', '--profile', 'brand-a'], explanation: 'Save a second account under the brand-a profile.' },
    { argv: ['setup', 'x'], explanation: 'On a terminal, the guided X setup; without one, the steps as JSON.' },
    { argv: ['setup', 'x', '--keys-stdin'], explanation: 'Save four X keys piped in, one per line, once X confirms they can post.' },
  ],
  output:
    'The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`, and for X the same with `"platform":"x"` and a `note` on credits. Without a terminal and without --token-stdin or --keys-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.',
  mutates: true,
  errors: [
    'unknown-option',
    'unexpected-argument',
    'unknown-platform',
    'invalid-profile',
    'no-home',
    'cancelled',
    'unauthorized',
    'rate-limited',
    'rejected',
    'network-failed',
    'timeout',
    'corrupt',
    'unreadable',
    'write-failed',
  ],
};
