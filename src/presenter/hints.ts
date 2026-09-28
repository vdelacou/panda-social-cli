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
  'unknown-platform': 'Name a platform the command takes, threads or x, as its examples show.',
  'missing-text': 'Pass the text of the post with --text (quoted when it contains spaces), an image with --image (a URL on Threads, a local file on X), or both.',
  'text-too-long':
    'Threads allows 500 characters per post, an emoji counting its UTF-8 bytes; X allows 280, most characters counting 1, CJK characters and emoji 2, a link 23. Shorten the text, or pass --split to post it as a thread of replies; an X edit is one post, so pass --repost there instead.',
  'invalid-image':
    'Threads needs a public https URL to a JPEG or PNG image, 8 MB at most: host a local file first, then pass its URL. X needs a local JPEG, PNG, GIF or WEBP file, 5 MB at most: download a remote image first, then pass its path.',
  'image-rejected':
    'The platform could not use the image. Threads: check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most. X: check that the file opens as a JPEG, PNG, GIF or WEBP image. Then retry.',
  'still-processing': 'Threads was still processing the image after 60 seconds, so nothing was published. Retry the post.',
  'invalid-post-id': 'Pass the numeric id that post returned, for example --id 17890000000000001 on Threads or --id 1880000000000000001 on X.',
  unsupported: 'Threads cannot edit a published post. Pass --repost to delete it and publish the new version: it gets a new id and link, and loses its likes and replies.',
  'edit-refused':
    'X edits a post only for an X Premium account, within a short window after posting (30 minutes or 1 hour, X pages differ) and 5 times at most. Pass --repost to delete the post and publish the new version instead: it gets a new id and link, and loses its likes and replies.',
  'duplicate-text': "X refuses a post whose text repeats one of the account's recent posts. Change the text, or delete the earlier post first.",
  forbidden:
    "The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console.",
  'read-only-keys':
    'These X keys can read but not post. In the developer console, set the app permissions to Read and write, then regenerate the Access Token and Secret (keys made earlier stay read-only) and run `panda-social setup x` again.',
  'credits-depleted': 'X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry.',
  'invalid-keys': 'Paste the four X keys in this order, one per line: API Key, API Key Secret, Access Token, Access Token Secret.',
  'incomplete-environment':
    'Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys.',
  'invalid-profile': 'Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a',
  'missing-credentials':
    'Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables.',
  unauthorized: `The platform refused the credentials. Threads: generate a new token (${TOKEN_SOURCE}) and run \`panda-social setup threads\` again. X: regenerate the Access Token and Secret in the developer console and run \`panda-social setup x\` again.`,
  'rate-limited': 'Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry.',
  rejected: 'The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry.',
  'network-failed': 'The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry.',
  timeout: 'The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying.',
  cancelled: 'The setup stopped before the credentials were pasted. Run the same setup command again when you have them.',
  corrupt: `The credentials file is not valid. Fix or delete ${CREDENTIALS_FILE}, then run the setup again for each platform.`,
  unreadable: `The credentials file could not be read. Check that ${CREDENTIALS_FILE} belongs to you.`,
  'write-failed': 'The credentials could not be saved. Check that your home folder is writable, then run the setup again.',
  'no-home':
    'Set HOME (USERPROFILE on Windows), or pass the credentials in the environment instead of saving them: PANDA_SOCIAL_THREADS_TOKEN, or the four PANDA_SOCIAL_X_ variables.',
};

const FALLBACK = 'Rerun with PANDA_SOCIAL_LOG_LEVEL=info to see the details on stderr.';

export const hintFor = (code: string): string => (Object.hasOwn(HINTS, code) ? (HINTS[code] ?? FALLBACK) : FALLBACK);

export const documentedHints = (): ReadonlyArray<{ readonly code: string; readonly hint: string }> =>
  Object.entries(HINTS)
    .map(([code, hint]) => ({ code, hint }))
    .toSorted((left, right) => left.code.localeCompare(right.code));
