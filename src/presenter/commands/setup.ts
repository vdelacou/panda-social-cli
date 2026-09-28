import type { CommandSpec } from '../command-spec.ts';

export const SETUP_PLATFORMS: ReadonlyArray<string> = ['threads'];

export const SETUP: CommandSpec = {
  name: 'setup',
  summary: 'Connect a Threads account and save its token under a profile.',
  description:
    'On a terminal, walks a first-time user through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, the token) one at a time, then reads the token without showing it. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin it reads the token from standard input. Every token is checked with Threads before it is saved in ~/.panda-social/credentials.json, readable by its owner only.',
  arguments: [{ name: 'platform', required: true, description: 'The platform to connect.', values: SETUP_PLATFORMS }],
  options: [
    { name: 'token-stdin', type: 'boolean', required: false, description: 'Read the token from standard input instead of asking for it.' },
    { name: 'profile', type: 'string', placeholder: 'name', required: false, description: 'The profile to save the account under. Defaults to "default".' },
  ],
  examples: [
    { argv: ['setup', 'threads'], explanation: 'On a terminal, the guided setup; without one, the steps as JSON.' },
    { argv: ['setup', 'threads', '--token-stdin'], explanation: 'Save a token piped in on standard input, once Threads confirms it.' },
    { argv: ['setup', 'threads', '--token-stdin', '--profile', 'brand-a'], explanation: 'Save a second account under the brand-a profile.' },
  ],
  output:
    'The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`. Without a terminal and without --token-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.',
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
