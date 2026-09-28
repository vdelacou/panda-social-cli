# panda-social-cli

Post text, an image, or both to Threads, X, Facebook Pages and Instagram from one command line or one TypeScript library. It is built for AI agents first: every command answers in JSON, and every error names its cause and the next step to fix it.

> Status: under construction. Threads works from source: guided setup, text and image posts, long texts as reply threads, delete, update by reposting, a `status` check, a saved token that refreshes itself, and commands that document themselves for agents. The other three platforms are next. Nothing is published to npm yet.

## What each platform allows

The CLI can only do what each platform's API permits. As of September 2026:

| Platform | Text only | Local image | Edit | Delete | Cost |
|---|---|---|---|---|---|
| Threads | yes, 500 characters | public URL only | no, `--repost` deletes and republishes | yes, 100 a day | free |
| X | yes, 280 characters | direct upload | X Premium only, within 1 hour | yes | pay-per-use credits |
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
```

`setup threads` walks you through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, and the token), one at a time. You paste the token without it showing on screen; the CLI checks it with Threads and saves it in `~/.panda-social/credentials.json`, readable by you only. The same steps, with what each permission is for and the usual failures and their fixes, are in [docs/setup/threads.md](docs/setup/threads.md).

An agent runs the same command without a terminal and gets the six steps as JSON, to relay to its human. It then finishes with `panda-social setup threads --token-stdin`, piping the token in.

Threads downloads images itself, so `--image` takes a public https URL, not a local file. A text over 500 characters is refused unless `--split` posts it as a thread of replies; if one reply fails, the parts already out are deleted and the error lists any that could not be. Threads has no edit: `update --on threads --id <id> --text "..." --repost` deletes the post and publishes the new version, which gets a new id and link.

A Threads token lives 60 days from its last refresh. Every Threads command refreshes a saved token once it is 30 days old, so a CLI that runs at least once a month never needs the setup again; a refresh that fails leaves a warning on stderr and the command carries on with the token it has. `status threads` shows whose token it is, how old it is and how much of the rolling 24-hour quotas is used (250 posts, 1,000 replies, 100 deletes).

For several accounts, add `--profile brand-a` to `setup`, `post`, `update`, `delete` and `status`. `PANDA_SOCIAL_THREADS_TOKEN` overrides the saved token, which suits CI.

Every command prints one JSON line on stdout and exits 0 or 1; the guide and the logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured for the \"default\" profile.","hint":"Connect an account with `panda-social setup threads` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN."}}
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

## Develop

Requires Bun 1.3 or newer.

```bash
bun install
git config core.hooksPath .githooks
```

The hooks run the fast gates on every commit. CI runs the full set, coverage and mutation included.

Every command is described once, in `src/presenter/command-registry.ts` with one file per command under `src/presenter/commands/`: the parser, `help-json`, `docs` and the generated docs all read it. After changing a command, run `bun run docs:gen`; CI fails when `docs/COMMANDS.md` or `docs/commands.json` no longer matches the registry. The same `docs:check` holds the two hand-written pages to the code: every `panda-social` line in their bash blocks must parse, and the setup guide must carry every step the CLI shows.

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
