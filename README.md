# panda-social-cli

Post text, an image, or both to Threads, X, Facebook Pages and Instagram from one command line or one TypeScript library. It is built for AI agents first: every command answers in JSON, and every error names its cause and the next step to fix it.

> Status: under construction. Threads works from source: guided setup, text and image posts, long texts as reply threads, delete, update by reposting, and commands that document themselves for agents. Token refresh, a `status` command and the other three platforms are next. Nothing is published to npm yet.

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
```

`setup threads` walks you through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, and the token), one at a time. You paste the token without it showing on screen; the CLI checks it with Threads and saves it in `~/.panda-social/credentials.json`, readable by you only.

An agent runs the same command without a terminal and gets the six steps as JSON, to relay to its human. It then finishes with `panda-social setup threads --token-stdin`, piping the token in.

Threads downloads images itself, so `--image` takes a public https URL, not a local file. A text over 500 characters is refused unless `--split` posts it as a thread of replies; if one reply fails, the parts already out are deleted and the error lists any that could not be. Threads has no edit: `update --on threads --id <id> --text "..." --repost` deletes the post and publishes the new version, which gets a new id and link.

For several accounts, add `--profile brand-a` to `setup`, `post`, `update` and `delete`. `PANDA_SOCIAL_THREADS_TOKEN` overrides the saved token, which suits CI.

Every command prints one JSON line on stdout and exits 0 or 1; the guide and the logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured for the \"default\" profile.","hint":"Connect an account with `panda-social setup threads` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN."}}
```

## For agents

Start with `panda-social help-json`. It answers with one JSON manifest: the output contract, every command with its usage line, parameters, examples and output, and the next step for every error code. `panda-social docs <command>` returns one command's page as markdown, and `panda-social --version` the installed version. The same content is committed as [docs/COMMANDS.md](docs/COMMANDS.md) and [docs/commands.json](docs/commands.json).

An option a command does not take, or an extra argument, is refused rather than ignored: an unquoted `--text Hello from panda` fails with a hint to quote it.

## As a library

In Bun or Node 20+:

```ts
import { createThreadsGraph } from 'panda-social-cli';

const posted = await createThreadsGraph({ token }).publishText('Hello from panda');
if (posted.ok) console.log(posted.value.url);
```

## Develop

Requires Bun 1.3 or newer.

```bash
bun install
git config core.hooksPath .githooks
```

The hooks run the fast gates on every commit. CI runs the full set, coverage and mutation included.

Every command is described once, in `src/presenter/command-registry.ts` with one file per command under `src/presenter/commands/`: the parser, `help-json`, `docs` and the generated docs all read it. After changing a command, run `bun run docs:gen`; CI fails when `docs/COMMANDS.md` or `docs/commands.json` no longer matches the registry.

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
