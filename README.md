# panda-social-cli

Post text, an image, or both to Threads, X, Facebook Pages and Instagram from one command line or one TypeScript library. It is built for AI agents first: every command answers in JSON, and every error names its cause and the next step to fix it.

> Status: under construction. Threads works from source: guided setup, text and image posts, long texts as reply threads, delete, update by reposting, a `status` check, a saved token that refreshes itself, and commands that document themselves for agents. X works too: guided setup, text and image posts, long texts as threads, edits in place (X Premium) or by reposting, delete and a `status` check. Facebook and Instagram come after. Nothing is published to npm yet.

## What each platform allows

The CLI can only do what each platform's API permits. As of September 2026:

| Platform | Text only | Local image | Edit | Delete | Cost |
|---|---|---|---|---|---|
| Threads | yes, 500 characters | public URL only | no, `--repost` deletes and republishes | yes, 100 a day | free |
| X | yes, 280 weighted characters | direct upload | X Premium only, shortly after posting | yes | pay-per-use credits |
| Facebook Page | yes | direct upload | posts made by this app | yes | free |
| Instagram | no | public URL only, JPEG | no | with Facebook Login only | free |

## Try it from source

```bash
bun install
bun run src/main.ts setup threads
bun run src/main.ts post --to threads --text "Hello from panda"
bun run src/main.ts post --to threads --image https://cdn.example.com/cat.jpg --text "A cat on the sofa"
bun run src/main.ts delete --on threads --id 17890000000000001
bun run src/main.ts status threads
bun run src/main.ts setup x
bun run src/main.ts post --to x --text "Hello from panda"
bun run src/main.ts post --to x --image ./chart.png --text "This week in one chart"
bun run src/main.ts status x
```

`setup threads` walks you through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, and the token), one at a time. You paste the token without it showing on screen; the CLI checks it with Threads and saves it in `~/.panda-social/credentials.json`, readable by you only. The same steps, with what each permission is for and the usual failures and their fixes, are in [docs/setup/threads.md](docs/setup/threads.md).

An agent runs the same command without a terminal and gets the six steps as JSON, to relay to its human. It then finishes with `panda-social setup threads --token-stdin`, piping the token in.

Threads downloads images itself, so `--image` takes a public https URL, not a local file. A text over 500 characters is refused unless `--split` posts it as a thread of replies; if one reply fails, the parts already out are deleted and the error lists any that could not be. Threads has no edit: `update --on threads --id <id> --text "..." --repost` deletes the post and publishes the new version, which gets a new id and link.

A Threads token lives 60 days from its last refresh. Every Threads command refreshes a saved token once it is 30 days old, so a CLI that runs at least once a month never needs the setup again; a refresh that fails leaves a warning on stderr and the command carries on with the token it has. `status threads` shows whose token it is, how old it is and how much of the rolling 24-hour quotas is used (250 posts, 1,000 replies, 100 deletes).

`setup x` connects X the same way, in five steps: the developer console, API credits with a spending limit, an app, its Read and write permission, and the four keys, which you paste without them showing and the CLI checks with X before saving them in the same file. X has no free tier: every request spends the app's prepaid credits, the setup's own check included (about $0.01). The steps, the prices and the usual failures are in [docs/setup/x.md](docs/setup/x.md). An agent finishes with `panda-social setup x --keys-stdin`, piping the four keys in, one per line. `status x` shows whose keys they are and the access level X states for them.

On X, `--image` takes a local JPEG, PNG, GIF or WEBP file of 5 MB at most, which the CLI checks by its first bytes and uploads; an https URL is refused, since the CLI never downloads anything for you. X counts 280 characters its own way: most characters 1, CJK characters and emoji 2, a link 23 however long, and `--split` threads a longer text as on Threads. `update --on x` edits the post in place, which X allows only for X Premium accounts, shortly after posting and 5 times at most; `--repost` deletes and republishes instead. Every post costs $0.015 of credits, and $0.20 when its text contains a link.

For several accounts, add `--profile brand-a` to `setup`, `post`, `update`, `delete` and `status`. `PANDA_SOCIAL_THREADS_TOKEN` overrides the saved Threads token, and the four `PANDA_SOCIAL_X_` variables the saved X keys, which suits CI.

Every command prints one JSON line on stdout and exits 0 or 1; the guide and the logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured for the \"default\" profile.","hint":"Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables."}}
```

## For agents

Start with `panda-social help-json`. It answers with one JSON manifest: the output contract, every command with its usage line, parameters, examples and output, and the next step for every error code. `panda-social docs <command>` returns one command's page as markdown, and `panda-social --version` the installed version. The same content is committed as [docs/COMMANDS.md](docs/COMMANDS.md) and [docs/commands.json](docs/commands.json).

An option a command does not take, or an extra argument, is refused rather than ignored: an unquoted `--text Hello from panda` fails with a hint to quote it.

[skills/SKILL.md](skills/SKILL.md) is an agent skill for the CLI: when to use it and when not, the user's approval before anything is posted or deleted, the setup handoff that keeps the token out of the chat, and what each answer means. For Claude Code, copy it to `~/.claude/skills/panda-social/SKILL.md`, or to `.claude/skills/panda-social/SKILL.md` in one project.

## As a library

In Bun or Node 20+:

```ts
import { createThreadsGraph } from 'panda-social-cli';

const posted = await createThreadsGraph({ token }).publishText('Hello from panda');
if (posted.ok) console.log(posted.value.url);
```

The same adapter answers `whoAmI()`, `refreshToken()` and `publishingLimits(userId)`, the id being the one `whoAmI()` returns.

For X, with the four keys of the setup:

```ts
import { createXApi, xTextLength } from 'panda-social-cli';

const x = createXApi({ keys: { apiKey, apiSecret, accessToken, accessSecret } });
const text = 'Hello from panda';
if (xTextLength(text) <= 280) {
  const posted = await x.createPost({ text });
  if (posted.ok) console.log(posted.value.url);
}
```

`x.uploadImage(image)` takes an image checked by `parseXImage(bytes, name)` and answers the media id to pass as `mediaIds`; `x.deletePost(id)` takes an id checked by `parseXPostId`.

## Develop

Requires Bun 1.3 or newer.

```bash
bun install
git config core.hooksPath .githooks
```

The hooks run the fast gates on every commit. CI runs the full set, coverage and mutation included.

Every command is described once, in `src/presenter/command-registry.ts` with one file per command under `src/presenter/commands/`: the parser, `help-json`, `docs` and the generated docs all read it. After changing a command, run `bun run docs:gen`; CI fails when `docs/COMMANDS.md` or `docs/commands.json` no longer matches the registry. The same `docs:check` holds the hand-written pages to the code: every `panda-social` line in the bash blocks of the skill and the setup guides must parse, and each setup guide must carry every step the CLI shows.

`bun run build` writes the npm package to `dist/`: `cli.js` (the `panda-social` bin) and `index.js` (the library), both bundled for Node 20+ and Bun, with type declarations. `bun run smoke:dist` runs the built package under both runtimes.

## Verify

```bash
bun run lint
bun run typecheck
bun test
bun run coverage
bun run build
bun run smoke:dist
```

## License

MIT
