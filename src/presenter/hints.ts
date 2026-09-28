// The next step for every failure code an agent can receive, in the words a
// first-time user needs (references/product.md: name the cause and the next step).
const TOKEN_SOURCE = 'Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator';
const CREDENTIALS_FILE = '~/.panda-social/credentials.json';

const HINTS: Readonly<Record<string, string>> = {
  'missing-credentials': 'Connect an account with `panda-social setup threads` (add --profile <name> for another profile), or set PANDA_SOCIAL_THREADS_TOKEN.',
  unauthorized: `Threads refused the token. Generate a new one (${TOKEN_SOURCE}) and run \`panda-social setup threads\` again.`,
  'rate-limited': 'Threads allows 250 posts per 24 hours. Wait, then retry.',
  rejected: 'Threads rejected the request. Check the text (500 characters at most), then retry.',
  'network-failed': 'graph.threads.net could not be reached. Check the network, then retry.',
  timeout: 'Threads did not answer in time. The post may still have gone out: check the profile before retrying.',
  cancelled: 'The setup stopped before a token was pasted. Run `panda-social setup threads` again when you have it.',
  corrupt: `The credentials file is not valid. Fix or delete ${CREDENTIALS_FILE}, then run \`panda-social setup threads\`.`,
  unreadable: `The credentials file could not be read. Check that ${CREDENTIALS_FILE} belongs to you.`,
  'write-failed': 'The token could not be saved. Check that your home folder is writable, then run the setup again.',
  'no-home': 'Set HOME (USERPROFILE on Windows), or pass the token in PANDA_SOCIAL_THREADS_TOKEN instead of saving it.',
};

const FALLBACK = 'Rerun with PANDA_SOCIAL_LOG_LEVEL=info to see the details on stderr.';

export const hintFor = (code: string): string => (Object.hasOwn(HINTS, code) ? (HINTS[code] ?? FALLBACK) : FALLBACK);
