# panda-social-cli

Post text, an image, or both to Threads, X, Facebook Pages and Instagram from one command line or one TypeScript library. It is built for AI agents first: every command answers in JSON, and every error names its cause and the next step to fix it.

> Status: under construction. Text posts to Threads work from source; the other platforms, guided setup, update and delete are next. Nothing is published to npm yet.

## What each platform allows

The CLI can only do what each platform's API permits. As of September 2026:

| Platform | Text only | Local image | Edit | Delete | Cost |
|---|---|---|---|---|---|
| Threads | yes, 500 characters | public URL only | no, `--repost` deletes and republishes | yes, 100 a day | free |
| X | yes, 280 characters | direct upload | X Premium only, within 1 hour | yes | pay-per-use credits |
| Facebook Page | yes | direct upload | posts made by this app | yes | free |
| Instagram | no | public URL only, JPEG | no | with Facebook Login only | free |

## Try it from source

Get a Threads access token from your Meta app (Use cases, Access the Threads API, Settings, User Token Generator), then:

```bash
bun install
PANDA_SOCIAL_THREADS_TOKEN=<token> bun run src/main.ts post --to threads --text "Hello from panda"
```

Every command prints one JSON line on stdout and exits 0 or 1; logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured.","hint":"Set PANDA_SOCIAL_THREADS_TOKEN to a Threads access token (...)."}}
```

As a library, in Bun or Node 20+:

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
