// The next step for every failure code an agent can receive, in the words a
// first-time user needs (references/product.md: name the cause and the next step).
// help-json and docs/COMMANDS.md publish this table; a test keeps it and the codes
// the commands declare in step, both ways.
const TOKEN_SOURCE = 'Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator';
const CREDENTIALS_FILE = '~/.panda-social/credentials.json';

const HINTS: Readonly<Record<string, string>> = {
  'unknown-command': 'Run `panda-social help-json` for every command, or `panda-social docs <command>` for one.',
  'unknown-option': 'Run `panda-social docs <command>` for the options that command takes.',
  'unexpected-argument': 'Quote any value that contains spaces, for example --text "Hello from panda".',
  'unknown-platform': 'Threads is the only platform so far: name threads, as the command examples show.',
  'missing-text': 'Pass the text of the post with --text (quoted when it contains spaces), an image URL with --image, or both.',
  'text-too-long': 'Threads allows 500 characters per post, an emoji counting its UTF-8 bytes. Shorten the text, or pass --split to post it as a thread of replies.',
  'invalid-image': 'Threads needs a public https URL to a JPEG or PNG image, 8 MB at most. Host a local file first, then pass its URL with --image.',
  'image-rejected': 'Threads could not download or read the image. Check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most, then retry.',
  'still-processing': 'Threads was still processing the image after 60 seconds, so nothing was published. Retry the post.',
  'invalid-post-id': 'Pass the numeric id that post returned, for example --id 17890000000000001.',
  unsupported: 'Threads cannot edit a published post. Pass --repost to delete it and publish the new version: it gets a new id and link, and loses its likes and replies.',
  forbidden:
    'The token lacks a permission this action needs: threads_delete to delete, threads_manage_replies for --split. Add it under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again.',
  'invalid-profile': 'Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a',
  'missing-credentials': 'Connect an account with `panda-social setup threads` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN.',
  unauthorized: `Threads refused the token. Generate a new one (${TOKEN_SOURCE}) and run \`panda-social setup threads\` again.`,
  'rate-limited': 'Threads allows 250 posts and 100 deletes per 24 hours. Wait, then retry.',
  rejected: 'Threads rejected the request; the message says why. Fix what it names (the text, the image URL or the post id), then retry.',
  'network-failed': 'graph.threads.net could not be reached. Check the network, then retry.',
  timeout: 'Threads did not answer in time, so the post or the delete may still have gone through: check the profile before retrying.',
  cancelled: 'The setup stopped before a token was pasted. Run `panda-social setup threads` again when you have it.',
  corrupt: `The credentials file is not valid. Fix or delete ${CREDENTIALS_FILE}, then run \`panda-social setup threads\`.`,
  unreadable: `The credentials file could not be read. Check that ${CREDENTIALS_FILE} belongs to you.`,
  'write-failed': 'The token could not be saved. Check that your home folder is writable, then run the setup again.',
  'no-home': 'Set HOME (USERPROFILE on Windows), or pass the token in PANDA_SOCIAL_THREADS_TOKEN instead of saving it.',
};

const FALLBACK = 'Rerun with PANDA_SOCIAL_LOG_LEVEL=info to see the details on stderr.';

export const hintFor = (code: string): string => (Object.hasOwn(HINTS, code) ? (HINTS[code] ?? FALLBACK) : FALLBACK);

export const documentedHints = (): ReadonlyArray<{ readonly code: string; readonly hint: string }> =>
  Object.entries(HINTS)
    .map(([code, hint]) => ({ code, hint }))
    .toSorted((left, right) => left.code.localeCompare(right.code));
