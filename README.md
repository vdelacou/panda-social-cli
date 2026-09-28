# panda-social-cli

Post text, an image, or both to Threads, X, Facebook Pages and Instagram from one command line or one TypeScript library. It is built for AI agents first: every command answers in JSON, and every error names its cause and the next step to fix it.

> Status: under construction. Threads works from source: guided setup, text and image posts, long texts as reply threads, delete, update by reposting, a `status` check, a saved token that refreshes itself, and commands that document themselves for agents. X works too: guided setup, text and image posts, long texts as threads, edits in place (X Premium) or by reposting, delete and a `status` check. A Facebook Page works too: guided setup, text and photo posts (a URL or a local file), edits of the text in place, delete and a `status` check. Instagram works too: guided setup, image posts with a caption (a public URL), a `status` check and a saved token that renews itself; editing and deleting there wait for the Facebook Login option. One `post` can go to several platforms at once. Nothing is published to npm yet.

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
bun run src/main.ts setup facebook
bun run src/main.ts post --to facebook --image ./chart.png --text "This week in one chart"
bun run src/main.ts status facebook
bun run src/main.ts setup instagram
bun run src/main.ts post --to instagram --image https://cdn.example.com/cat.jpg --text "A cat on the sofa"
bun run src/main.ts status instagram
bun run src/main.ts post --to threads,x,facebook --text "Hello from panda"
```

`setup threads` walks you through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, and the token), one at a time. You paste the token without it showing on screen; the CLI checks it with Threads and saves it in `~/.panda-social/credentials.json`, readable by you only. The same steps, with what each permission is for and the usual failures and their fixes, are in [docs/setup/threads.md](docs/setup/threads.md).

An agent runs the same command without a terminal and gets the six steps as JSON, to relay to its human. It then finishes with `panda-social setup threads --token-stdin`, piping the token in.

Threads downloads images itself, so `--image` takes a public https URL, not a local file. A text over 500 characters is refused unless `--split` posts it as a thread of replies; if one reply fails, the parts already out are deleted and the error lists any that could not be. Threads has no edit: `update --on threads --id <id> --text "..." --repost` deletes the post and publishes the new version, which gets a new id and link.

A Threads token lives 60 days from its last refresh. Every Threads command refreshes a saved token once it is 30 days old, so a CLI that runs at least once a month never needs the setup again; a refresh that fails leaves a warning on stderr and the command carries on with the token it has. `status threads` shows whose token it is, how old it is and how much of the rolling 24-hour quotas is used (250 posts, 1,000 replies, 100 deletes).

`setup x` connects X the same way, in five steps: the developer console, API credits with a spending limit, an app, its Read and write permission, and the four keys, which you paste without them showing and the CLI checks with X before saving them in the same file. X has no free tier: every request spends the app's prepaid credits, the setup's own check included (about $0.01). The steps, the prices and the usual failures are in [docs/setup/x.md](docs/setup/x.md). An agent finishes with `panda-social setup x --keys-stdin`, piping the four keys in, one per line. `status x` shows whose keys they are and the access level X states for them.

On X, `--image` takes a local JPEG, PNG, GIF or WEBP file of 5 MB at most, which the CLI checks by its first bytes and uploads; an https URL is refused, since the CLI never downloads anything for you. X counts 280 characters its own way: most characters 1, CJK characters and emoji 2, a link 23 however long, and `--split` threads a longer text as on Threads. `update --on x` edits the post in place, which X allows only for X Premium accounts, shortly after posting and 5 times at most; `--repost` deletes and republishes instead. Every post costs $0.015 of credits, and $0.20 when its text contains a link.

`setup facebook` connects a Facebook Page in five steps: an app with the "Manage everything on your Page" use case, its posting permissions, publishing the app (until then, only people with a role on it see its posts), a user token from the Graph API Explorer, and that token extended to 60 days in the Access Token Debugger, which spares you the app secret. You paste the extended token without it showing; the CLI asks Meta which Pages it grants, keeps the chosen Page's own token, which does not expire, and never saves yours. When the token grants several Pages, it asks which one to keep, or takes `--page <id>`. The steps and the usual failures are in [docs/setup/facebook.md](docs/setup/facebook.md). An agent finishes with `panda-social setup facebook --token-stdin`, piping the token in. `status facebook` shows which Page the saved token belongs to.

On Facebook, `--image` takes an https URL, which Facebook downloads, or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB at most, which the CLI checks by its first bytes and uploads; the text becomes the photo's caption. A long text goes out whole, so `--split` changes nothing there. A post id is the Page id and the post number joined by an underscore, as `post` answers it. `update --on facebook` edits the text in place, which Meta allows for posts this app made; a new image needs `--repost`, which deletes the post and publishes the new version. Facebook posts are free.

`setup instagram` connects an Instagram account in six steps: switching it to a professional account (Creator or Business), an app with the "Manage messaging & content on Instagram" use case, its permissions, a tester invitation and its acceptance in Instagram, and a token generated in the app dashboard. It goes through Instagram Login, so no Facebook Page is needed. You paste the token without it showing; the CLI checks it with Instagram and saves it with the account's id and username. Like the Threads token, it lasts 60 days and is renewed once it is 30 days old whenever a command runs. The steps and the usual failures are in [docs/setup/instagram.md](docs/setup/instagram.md). An agent finishes with `panda-social setup instagram --token-stdin`, piping the token in. `status instagram` shows whose token it is, how old it is and how much of the rolling 24-hour posts quota is used (Meta's pages give 50 or 100 posts; the answer is the account's own figure).

On Instagram, a post is an image: `--image` takes a public https URL to a JPEG of 8 MB at most, with an aspect ratio between 4:5 and 1.91:1, which Instagram downloads itself, and `--text` becomes its caption, sent whole (Instagram holds 2,200 characters, 30 hashtags and 20 @ tags); a text alone is refused as `missing-image`. The CLI waits for Instagram to process the image, 60 seconds at most, publishes it and answers its id and link. Instagram Login can neither edit nor delete a post, so `update` and `delete` answer `unsupported` there: change or delete it in the Instagram app. Instagram posts are free.

To post the same thing to several platforms, name them in one `--to`, separated by commas: `post --to threads,x,facebook --text "..."`. The CLI first checks the flags against every named platform, so a flag one of them refuses (an https image for X, a text alone for Instagram) stops the command before anything is posted, naming that platform. Then the platforms post one after another, in the order given, and a failure on one never stops the next. When every post goes out, the answer is `{"ok":true,"data":{"posts":[...]}}`, each post as that platform answers it alone. Otherwise the run exits 1 with `partly-published` (or `not-published`), `details.published` listing the posts that exist and `details.failed` each platform that failed, with its code and hint: retry only those, since posting again to the others would duplicate their post. Until a Facebook Page can host local images for Threads and Instagram, an image goes to several platforms only when they all take its kind: an https URL for Threads, Instagram and Facebook, a local file for X and Facebook.

For several accounts, add `--profile brand-a` to `setup`, `post`, `update`, `delete` and `status`. `PANDA_SOCIAL_THREADS_TOKEN` overrides the saved Threads token, the four `PANDA_SOCIAL_X_` variables the saved X keys, `PANDA_SOCIAL_FACEBOOK_PAGE_ID` with `PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN` the saved Page, and `PANDA_SOCIAL_INSTAGRAM_TOKEN` the saved Instagram token, which suits CI. A token from the environment is never renewed by the CLI.

Every command prints one JSON line on stdout and exits 0 or 1; the guide and the logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured for the \"default\" profile.","hint":"Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN."}}
```

## For agents

Start with `panda-social help-json`. It answers with one JSON manifest: the output contract, every command with its usage line, parameters, examples and output, and the next step for every error code. `panda-social docs <command>` returns one command's page as markdown, and `panda-social --version` the installed version. The same content is committed as [docs/COMMANDS.md](docs/COMMANDS.md) and [docs/commands.json](docs/commands.json).

An option a command does not take, or an extra argument, is refused rather than ignored: an unquoted `--text Hello from panda` fails with a hint to quote it. A near miss names what it was meant to be: `--to thread` fails with a hint that starts `Did you mean "threads"?`, and so does a mistyped command, platform or option.

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

For a Facebook Page, with the Page's own token and id, as `setup facebook` saves them:

```ts
import { createFacebookGraph, parseFacebookPageId } from 'panda-social-cli';

const pageId = parseFacebookPageId('104000000000001');
if (pageId.ok) {
  const posted = await createFacebookGraph({ token: pageToken }).publishText(pageId.value, 'Hello from panda');
  if (posted.ok) console.log(posted.value.url);
}
```

The same adapter answers `publishPhoto(pageId, photo, caption)`, with a photo `{ kind: 'url', url }` checked by `parseImageUrl` or `{ kind: 'upload', image }` checked by `parseFacebookImage(bytes, name)`, and `editText(id, text)` and `deletePost(id)` with an id checked by `parseFacebookPostId`.

For Instagram, with the token of `setup instagram`:

```ts
import { createInstagramGraph, parseImageUrl } from 'panda-social-cli';

const instagram = createInstagramGraph({ token });
const account = await instagram.whoAmI();
const imageUrl = parseImageUrl('https://cdn.example.com/cat.jpg');
if (account.ok && imageUrl.ok) {
  const posted = await instagram.publishImage(account.value.userId, imageUrl.value, 'A cat on the sofa');
  if (posted.ok) console.log(posted.value.url);
}
```

The same adapter answers `refreshToken()` and `publishingLimit(userId)`.

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
