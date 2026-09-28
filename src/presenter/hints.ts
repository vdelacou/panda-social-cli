// The next step for every failure code an agent can receive, in the words a
// first-time user needs (references/product.md: name the cause and the next step).
const TOKEN_SOURCE = 'Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator';

const HINTS: Readonly<Record<string, string>> = {
  'missing-credentials': `Set PANDA_SOCIAL_THREADS_TOKEN to a Threads access token (${TOKEN_SOURCE}).`,
  unauthorized: `Threads refused the token. Generate a new one (${TOKEN_SOURCE}) and set PANDA_SOCIAL_THREADS_TOKEN.`,
  'rate-limited': 'Threads allows 250 posts per 24 hours. Wait, then retry.',
  rejected: 'Threads rejected the request. Check the text (500 characters at most), then retry.',
  'network-failed': 'graph.threads.net could not be reached. Check the network, then retry.',
  timeout: 'Threads did not answer in time. The post may still have gone out: check the profile before retrying.',
};

const FALLBACK = 'Rerun with PANDA_SOCIAL_LOG_LEVEL=info to see the details on stderr.';

export const hintFor = (code: string): string => (Object.hasOwn(HINTS, code) ? (HINTS[code] ?? FALLBACK) : FALLBACK);
