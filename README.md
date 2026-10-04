# panda-social-cli

panda-social-cli is a command-line tool and a TypeScript library. It posts a text, an image, or a text with an image to Threads, X, Facebook Pages and Instagram.

AI agents are the first users of the tool. Each command writes its result in JSON. Each error gives its cause and the next step.

## Status

The tool is not complete. The package is not on npm at this time. You can use the tool from the source code.

All four platforms have a guided setup, posts, and a `status` command. One `post` command can post to more than one platform.

## Limits of each platform

The tool cannot do more than the API of each platform lets it do. These data are from September 2026.

| Platform | Text only | Image | Edit | Delete | Cost |
|---|---|---|---|---|---|
| Threads | Yes, 500 characters | Public https URL only | No. `--repost` deletes the post and publishes it again | Yes, 100 each day | Free |
| X | Yes, 280 weighted characters | Upload of a local file | X Premium only, a short time after the post | Yes | Pay-per-use credits |
| Facebook Page | Yes | Upload of a local file, or an https URL | Only the posts that this app made | Yes | Free |
| Instagram | No | Public https URL only, JPEG | No | Only with Facebook Login, which the tool does not have at this time | Free |

## Use the tool from the source code

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

## Threads

`setup threads` connects a Threads account in six steps. The command shows the steps one at a time. You do these steps one time only:

1. Make a Meta developer account.
2. Make an app with the Threads API.
3. Give the app its permissions.
4. Make your Threads account a tester of the app.
5. Accept the invitation in Threads.
6. Generate a token.

At the end, you paste the token. The token does not show on the screen. The tool makes sure that Threads accepts the token. Then the tool keeps the token in `~/.panda-social/credentials.json`. Only you can read this file.

The guide [docs/setup/threads.md](docs/setup/threads.md) gives the steps, the function of each permission, and the usual errors with their solutions.

An agent can run the same command without a terminal. Then the command gives the six steps in JSON, and the agent tells them to its user. The setup ends with `panda-social setup threads --token-stdin`, which reads the token on standard input.

Threads downloads each image from its URL. Thus, `--image` must be a public https URL, not a local file.

Threads rejects a text of more than 500 characters. With `--split`, the tool posts the text as a thread of replies. If one reply does not go out, the tool deletes the parts that are on Threads. The error shows each part that the tool did not delete.

Threads cannot edit a post. With `--repost`, `update --on threads --id <id> --text "..." --repost` deletes the post and publishes the new text. The new post has a new id and a new link.

A Threads token expires 60 days after its last refresh. Each Threads command refreshes a saved token 30 days after the tool saved it. Thus, if you use the tool one time each month, you do not do the setup again.

If Threads rejects a refresh, the command writes a warning to stderr. Then the command continues with the same token.

`status threads` shows the account of the token, the date when the tool saved the token, and the used part of each quota. Each quota is for the last 24 hours: 250 posts, 1,000 replies and 100 deletes.

## X

`setup x` connects an X account with the same procedure, in five steps:

1. Sign in to the X developer console.
2. Add API credits, with a spending limit.
3. Make an app.
4. Give the app the Read and write permission.
5. Generate the four keys.

At the end, you paste the four keys. The keys do not show on the screen. The tool makes sure that X accepts the keys. Then the tool keeps the keys in the same file.

X has no free tier. Each call to X uses some of the prepaid credits of the app. The check of the setup also uses credits, approximately $0.01.

The guide [docs/setup/x.md](docs/setup/x.md) gives the steps, the credits that each command uses, and the usual errors.

The setup ends with `panda-social setup x --keys-stdin`, which reads the four keys on standard input, with one key on each line. `status x` shows the account of the keys and the access level that X gives for them.

On X, `--image` must be a local file: JPEG, PNG, GIF or WEBP, 5 MB maximum. The tool examines the first bytes of the file. Then the tool uploads the file. The tool rejects an https URL, because it does not download files for you.

X counts the 280 characters with special weights. Most characters count 1, CJK characters and emoji count 2, and a link counts 23 at all lengths. With `--split`, the tool posts a longer text as a thread, as on Threads.

`update --on x` edits the post. X lets only X Premium accounts edit a post, a short time after the post and a maximum of 5 times. With `--repost`, the tool deletes the post and publishes it again.

Each post uses $0.015 of the credits. A post with a link in its text uses $0.20.

## Facebook Page

`setup facebook` connects a Facebook Page in five steps:

1. Make an app with the "Manage everything on your Page" use case.
2. Give the app its post permissions.
3. Publish the app. Before you publish it, only persons with a role on the app see its posts.
4. Get a user token in the Graph API Explorer.
5. Extend the token to 60 days in the Access Token Debugger. Thus, you do not use the app secret.

At the end, you paste the extended token. The token does not show on the screen. The tool gets the Pages of the token from Meta. Then the tool keeps the token of one Page. This Page token does not expire. The tool does not keep your user token.

If the token has more than one Page, the setup shows the Pages, and you type the id of one Page. You can also give the id with `--page <id>`.

The guide [docs/setup/facebook.md](docs/setup/facebook.md) gives the steps and the usual errors. The setup ends with `panda-social setup facebook --token-stdin`, which reads the token on standard input. `status facebook` shows the Page of the saved token.

On Facebook, `--image` can be an https URL or a local file. Facebook downloads the image from the URL. A local file must be JPEG, PNG, GIF, BMP or TIFF, 10 MB maximum. The tool examines the first bytes of the file, and then uploads it. The text becomes the caption of the photo.

Facebook keeps a long text in one post. Thus, `--split` has no effect on Facebook.

A post id is the Page id and the post number, with an underscore between them. `post` gives the post id in this format.

`update --on facebook` edits the text of the post. Meta lets the app edit only the posts that this app made. For a new image, use `--repost`. Then the tool deletes the post and publishes the new post.

Facebook posts are free.

## Instagram

`setup instagram` connects an Instagram account in six steps:

1. Change the account to a professional account (Creator or Business).
2. Make an app with the "Manage messaging & content on Instagram" use case.
3. Give the app its permissions.
4. Make the account a tester of the app.
5. Accept the invitation in Instagram.
6. Generate a token in the app dashboard.

The setup uses Instagram Login. Thus, a Facebook Page is not necessary.

At the end, you paste the token. The token does not show on the screen. The tool makes sure that Instagram accepts the token. Then the tool keeps the token with the id and the username of the account.

The token expires 60 days after its last renewal, as on Threads. Each command renews a saved token 30 days after the tool saved it.

The guide [docs/setup/instagram.md](docs/setup/instagram.md) gives the steps and the usual errors. The setup ends with `panda-social setup instagram --token-stdin`, which reads the token on standard input.

`status instagram` shows the account of the token and the date when the tool saved the token. It also shows the used part of the posts quota for the last 24 hours. The Meta documentation gives two different numbers: 50 posts and 100 posts. The output shows the number for your account.

On Instagram, each post is an image. `--image` must be a public https URL to a JPEG of 8 MB maximum. Use an image with an aspect ratio between 4:5 and 1.91:1. Instagram downloads the image from the URL.

`--text` becomes the caption, in one part. A caption has a maximum of 2,200 characters, 30 hashtags and 20 @ tags. The tool rejects a text without an image with the error `missing-image`.

Instagram must prepare the image before the post. The tool gives Instagram a maximum of 60 seconds for this. Then the tool publishes the post and writes its id and its link.

Instagram Login cannot edit or delete a post. Thus, `update` and `delete` give the error `unsupported` on Instagram. Edit or delete the post in the Instagram app.

Instagram posts are free.

## Post to more than one platform

To post the same text to more than one platform, put the platforms in one `--to`, with commas between them: `post --to threads,x,facebook --text "..."`.

First, the tool examines the flags for each platform. If one platform rejects a flag, the command stops before it posts. Examples are an https image for X, and a text without an image for Instagram. The error gives the name of that platform.

Then the platforms post one after the other, in the sequence that you gave. An error on one platform does not stop the next platform.

When all the posts go out, the output is `{"ok":true,"data":{"posts":[...]}}`. Each post in the list is the same as the output of one platform.

At the end, if a platform showed an error, the exit code is 1, and the error code is `partly-published` or `not-published`:

- `details.published` gives the posts that went out.
- `details.failed` gives each platform with an error, with its code and its hint.

Post again only to the platforms in `details.failed`. If you post again to the other platforms, they will show the same post two times.

At this time, a Facebook Page cannot keep local images for Threads and Instagram. Thus, one image can go to more than one platform only when all of them accept its type. An https URL is applicable to Threads, Instagram and Facebook. A local file is applicable to X and Facebook.

## Profiles and environment variables

For more than one account, add `--profile brand-a` to `setup`, `post`, `update`, `delete` and `status`.

Environment variables can replace the saved credentials, for example in CI:

- `PANDA_SOCIAL_THREADS_TOKEN` replaces the saved Threads token.
- The four `PANDA_SOCIAL_X_` variables replace the saved X keys.
- `PANDA_SOCIAL_FACEBOOK_PAGE_ID` and `PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN` replace the saved Page.
- `PANDA_SOCIAL_INSTAGRAM_TOKEN` replaces the saved Instagram token.

The tool does not renew a token from the environment.

## Output

Each command writes one JSON line to stdout. The exit code is 0 or 1. The guided setup and the logs go to stderr.

```json
{"ok":true,"data":{"platform":"threads","id":"17890000000000001","url":"https://www.threads.com/@you/post/..."}}
{"ok":false,"error":{"code":"missing-credentials","message":"No Threads token is configured for the \"default\" profile.","hint":"Connect the account with `panda-social setup threads`, `panda-social setup x`, `panda-social setup facebook` or `panda-social setup instagram` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, all four PANDA_SOCIAL_X_ variables, both PANDA_SOCIAL_FACEBOOK_ variables, or PANDA_SOCIAL_INSTAGRAM_TOKEN."}}
```

## For agents

Start with `panda-social help-json`. This command gives one JSON manifest with these items:

- The output contract
- Each command, with its usage line, its parameters, its examples and its output
- The next step for each error code.

`panda-social docs <command>` gives the page of one command in Markdown. `panda-social --version` gives the installed version. The repository also has the same data in [docs/COMMANDS.md](docs/COMMANDS.md) and [docs/commands.json](docs/commands.json).

The tool rejects an option or an argument that the command does not have. For example, `--text Hello from panda` without quotes gives an error, and the hint tells you to add quotes.

If a name has a small error, the hint gives the correct name. For example, `--to thread` gives a hint that starts with `Did you mean "threads"?`. Names of commands, platforms and options get the same help.

[skills/SKILL.md](skills/SKILL.md) is an agent skill for the tool. It tells the agent these items:

- When to use the tool, and when not to use it
- To get the approval of the user before each post or delete
- How to do the setup without the token in the chat
- How to read each output.

For Claude Code, copy the file to `~/.claude/skills/panda-social/SKILL.md`. For one project only, copy it to `.claude/skills/panda-social/SKILL.md` in that project.

## As a library

In Bun or Node 20+:

```ts
import { createThreadsGraph } from 'panda-social-cli';

const posted = await createThreadsGraph({ token }).publishText('Hello from panda');
if (posted.ok) console.log(posted.value.url);
```

The same adapter also gives `whoAmI()`, `refreshToken()` and `publishingLimits(userId)`. The id is the id from `whoAmI()`.

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

`x.uploadImage(image)` uploads an image from `parseXImage(bytes, name)`, and gives the media id for `mediaIds`. `x.deletePost(id)` deletes the post with an id from `parseXPostId`.

For a Facebook Page, with the token and the id of the Page that `setup facebook` saves:

```ts
import { createFacebookGraph, parseFacebookPageId } from 'panda-social-cli';

const pageId = parseFacebookPageId('104000000000001');
if (pageId.ok) {
  const posted = await createFacebookGraph({ token: pageToken }).publishText(pageId.value, 'Hello from panda');
  if (posted.ok) console.log(posted.value.url);
}
```

The same adapter also gives `publishPhoto(pageId, photo, caption)`. The photo is `{ kind: 'url', url }` from `parseImageUrl`, or `{ kind: 'upload', image }` from `parseFacebookImage(bytes, name)`. The adapter also gives `editText(id, text)` and `deletePost(id)`, with an id from `parseFacebookPostId`.

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

The same adapter also gives `refreshToken()` and `publishingLimit(userId)`.

## Develop

You must have Bun version 1.3 or higher.

```bash
bun install
git config core.hooksPath .githooks
```

The hooks run the fast gates at each commit. CI runs all the gates, with coverage and mutation.

The data of each command are in one location: `src/presenter/command-registry.ts`, with one file for each command in `src/presenter/commands/`. The parser, `help-json`, `docs` and the generated docs read these data.

After you change a command, run `bun run docs:gen`. CI shows an error if `docs/COMMANDS.md` or `docs/commands.json` is different from the registry.

`docs:check` also compares the written pages with the code. Each `panda-social` line in the bash blocks of the skill and of the setup guides must parse. Each setup guide must contain each step that the CLI shows.

`bun run build` writes the npm package to `dist/`: `cli.js` (the `panda-social` bin) and `index.js` (the library). The two files operate on Node 20+ and Bun, and have type declarations. `bun run smoke:dist` runs the built package on the two runtimes.

`bun scripts/live-qa.ts <platform>` runs the built CLI on the live platform, with the credentials on your computer. It writes a Markdown report with ids and outputs, but with no token:

- Without an option, it runs only `status`.
- With `--publish`, it posts test posts and then deletes them. You must delete the Instagram post in the Instagram app.
- With `--renewal`, it renews a Threads or Instagram token.
- `image-host` and `page-instagram` are two probes. They do not publish.

Run the script without an argument to see its options.

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
