import type { CommandSpec } from '../command-spec.ts';
import { PLATFORMS } from './shared-options.ts';

export const SETUP: CommandSpec = {
  name: 'setup',
  summary: 'Connect a Threads account, X keys, a Facebook Page or an Instagram account, and save the credentials under a profile.',
  description:
    "On a terminal, walks a first-time user through the one-time steps of the platform (six for Threads and Instagram, five for X and for Facebook) one at a time, then reads the Threads token, the four X keys, the Facebook token or the Instagram token without showing them. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin (Threads, Facebook, Instagram) or --keys-stdin (X, four lines: API Key, API Key Secret, Access Token, Access Token Secret) it reads them from standard input. The credentials are checked with the platform before they are saved in ~/.panda-social/credentials.json, readable by its owner only; X keys that X reports as read-only are refused. Checking X keys spends about $0.01 of X credits. For Facebook, the token is the long-lived user token of step 5: the CLI reads the Pages it grants, saves the chosen Page's own token, which does not expire, and never the user token; --page names the Page when the token grants several, and a Page on which the user cannot create content is refused. For Instagram, the token is the one the app dashboard generates for a professional account (Instagram Login, no Facebook Page needed); it lasts 60 days and renews itself once it is 30 days old, as the Threads token does.",
  arguments: [{ name: 'platform', required: true, description: 'The platform to connect.', values: PLATFORMS }],
  options: [
    { name: 'token-stdin', type: 'boolean', required: false, description: 'Threads, Facebook and Instagram: read the token from standard input instead of asking for it.' },
    {
      name: 'keys-stdin',
      type: 'boolean',
      required: false,
      description: 'X: read the four keys from standard input, one per line: API Key, API Key Secret, Access Token, Access Token Secret.',
    },
    { name: 'page', type: 'string', placeholder: 'page-id', required: false, description: 'Facebook: the id of the Page to connect, needed when the token grants several.' },
    { name: 'profile', type: 'string', placeholder: 'name', required: false, description: 'The profile to save the account under. Defaults to "default".' },
  ],
  examples: [
    { argv: ['setup', 'threads'], explanation: 'On a terminal, the guided setup; without one, the steps as JSON.' },
    { argv: ['setup', 'threads', '--token-stdin'], explanation: 'Save a token piped in on standard input, once Threads confirms it.' },
    { argv: ['setup', 'threads', '--token-stdin', '--profile', 'brand-a'], explanation: 'Save a second account under the brand-a profile.' },
    { argv: ['setup', 'x'], explanation: 'On a terminal, the guided X setup; without one, the steps as JSON.' },
    { argv: ['setup', 'x', '--keys-stdin'], explanation: 'Save four X keys piped in, one per line, once X confirms they can post.' },
    { argv: ['setup', 'facebook'], explanation: 'On a terminal, the guided Facebook setup; without one, the steps as JSON.' },
    {
      argv: ['setup', 'facebook', '--token-stdin', '--page', '104000000000001'],
      explanation: 'Save the Page 104000000000001 with a token piped in, once Meta confirms the token grants it.',
    },
    { argv: ['setup', 'instagram'], explanation: 'On a terminal, the guided Instagram setup; without one, the steps as JSON.' },
    { argv: ['setup', 'instagram', '--token-stdin'], explanation: 'Save an Instagram token piped in on standard input, once Instagram confirms whose it is.' },
  ],
  output:
    'The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`, for X the same with `"platform":"x"` and a `note` on credits, for Instagram the same with `"platform":"instagram"`, and for Facebook `{"platform":"facebook","profile":"<name>","pageId":"<id>","pageName":"<name>","note":"<posts stay private until the app is published>"}`. Without a terminal and without --token-stdin or --keys-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.',
  mutates: true,
  errors: [
    'unknown-option',
    'unexpected-argument',
    'unknown-platform',
    'invalid-profile',
    'no-home',
    'cancelled',
    'invalid-keys',
    'invalid-page-id',
    'no-pages',
    'choose-page',
    'missing-page-task',
    'unauthorized',
    'read-only-keys',
    'credits-depleted',
    'forbidden',
    'rate-limited',
    'rejected',
    'network-failed',
    'timeout',
    'corrupt',
    'unreadable',
    'write-failed',
  ],
};
