---
name: panda-social
description: >
  Publish, edit, replace and delete posts on the Threads and X accounts and the Facebook
  Page of the user, and publish images with captions to the Instagram account of the user,
  with the local panda-social CLI. A post can be a text, an image (a public URL on Threads
  and Instagram, a local file on X, a URL or a local file on Facebook), or a long text that the CLI
  divides into a thread of replies. The skill also examines a connected account and its
  limits, posts the same text to more than one platform, and helps a new user do the setup
  of Threads, X, a Facebook Page or an Instagram account. Use it when the user asks to
  "post", "share", "publish", "tweet", "thread", "reword", "edit", "repost" or "delete"
  something on Threads, X, Instagram or their Facebook Page. Also use it when the user asks
  if their connection operates, or how many more posts they can make today. Do not use it
  to read a feed, replies, mentions or insights, or to schedule a post.
---

# Post to Threads, X, Facebook and Instagram with panda-social

`panda-social` publishes to the Threads, X and Instagram accounts and the Facebook Page of the user. It uses the credentials that the user connected one time.

Each command writes one JSON line to stdout: `{"ok":true,"data":...}` or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}`. The exit code is 0 or 1. Warnings and logs go to stderr.

Your job has four parts:

1. Change the request of the user into the correct command.
2. Get the approval of the user for each command that publishes or deletes.
3. Run the command.
4. Tell the user the result in clear words.

## Instructions

- Get the approval of the user before each post. Show the full text of the post, and its image if there is one. Then wait for a yes before you run `post`. A post is public immediately after the command.
- If the user gave you the full text of the post, you can post this text without a change.
- A deleted post cannot come back. `update --repost` also deletes the post: it publishes the changed post as a new post, with a new id and a new link. The likes and the replies of the first post do not come back. Before a delete or a `--repost`, tell the user which post you will delete, and get a yes.
- On X, each post uses prepaid credits of the user: $0.015, or $0.20 when the text contains a link. Tell this to the user before you post a link or a long `--split` thread.
- Do not publish again without a new yes from the user. After a `timeout`, the post can be on the platform. Tell the user to look at the profile before you post again.
- Keep the tokens and the X keys out of the chat. The user pastes them into a terminal, not into the chat. Do not tell the user to give them to you. If you see a token or a key, do not write it again.
- Each error gives its solution in `error.hint`. Obey the hint, or tell the hint to the user, before you try again. Tell the user the result in clear words. The error codes and the command names are for you, not for the user.
- `panda-social help-json` gives each command, option, example and error code in one JSON document. `panda-social docs <command>` gives the page of one command. If this skill does not tell you how to do something, look there.

## Setup (one time)

```bash
panda-social --version
panda-social status threads
```

If the command is not available, the user can install it with `npm i -g panda-social-cli` (Node 20 or higher, or Bun) after npm has the package. Until then, the user runs it from a clone of the repository, with `bun run src/main.ts` in place of `panda-social`.

If `status threads` gives `missing-credentials`, Threads is not connected. Do these steps:

1. Run `panda-social setup threads`. When an agent runs it without a terminal, the command gives the six setup steps in JSON: `data.steps`. Each step has a `title`, its `actions`, and usually a `url`.
2. Tell the steps to the user one at a time. Wait until the user completes each step. The file `docs/setup/threads.md` in the panda-social-cli repository has the same steps, the function of each permission, and the usual errors.
3. After step 6, tell the user to run `panda-social setup threads` in a terminal. The user pushes Enter at each of the six steps, and then pastes the token at the prompt. The token does not show on the screen. The CLI saves the token only after Threads accepts it.
4. Run `panda-social status threads` again. If the output has `"ok":true` and the username of the user, the setup is correct.

To connect X, do the same procedure with `panda-social setup x`. The command gives five steps in JSON. Tell them to the user one at a time. The file `docs/setup/x.md` has the steps, the credit values and the usual errors. Then the user runs `panda-social setup x` in a terminal and pastes the four keys. The keys do not show on the screen.

X has no free tier. Before step 2, tell the user that each call uses prepaid credits. The check of the setup uses approximately $0.01. After the setup, `panda-social status x` gives the username of the user.

To connect a Facebook Page, do the same procedure with `panda-social setup facebook`. The command gives five steps in JSON. Tell them to the user one at a time. The file `docs/setup/facebook.md` has the steps and the usual errors.

Step 3 publishes the app. Until the user publishes the app, only persons with a role on the app see its posts. If the user does not do step 3, tell the user this fact. Then the user runs `panda-social setup facebook` in a terminal and pastes the extended token of step 5. The token does not show on the screen.

If the token has more than one Page, the CLI shows the Pages, and the user types the id of one Page. After the setup, `panda-social status facebook` gives the Page.

To connect Instagram, do the same procedure with `panda-social setup instagram`. The command gives six steps in JSON. Tell them to the user one at a time. The file `docs/setup/instagram.md` has the steps and the usual errors.

Step 1 changes the account to a professional account, and a professional account is public. Tell this to the user before step 1. Then the user runs `panda-social setup instagram` in a terminal and pastes the token of step 6. The token does not show on the screen. After the setup, `panda-social status instagram` gives the username and the posts quota for the day.

For more than one account, add `--profile <name>` to the same commands. A profile name contains lowercase letters, digits, `-` and `_`, for example `brand-a`.

## Commands for each request

| Request of the user | Command |
|---|---|
| A text post | `post --to threads --text "<text>"`, or `--to x`, or `--to facebook`. Instagram has no posts with only text. |
| An image post, with or without a caption | `post --to threads --image <https URL> --text "<caption>"`. On X: `post --to x --image <local file> --text "<caption>"`. On Facebook: an https URL or a local file. On Instagram: `post --to instagram --image <https URL to a JPEG> --text "<caption>"`. |
| A text that is longer than the limit: 500 characters on Threads, 280 on X. Facebook and Instagram keep a long text in one post. | The same command with `--split` |
| The same post on more than one platform | `post --to threads,x,facebook --text "<text>"`. The platforms post one after the other. |
| A change to the text of a Threads post | `update --on threads --id <post id> --text "<text>" --repost` |
| A change to the text of an X post | `update --on x --id <post id> --text "<text>"` edits the post (X Premium). With `--repost`, the CLI deletes the post and publishes it again. |
| A change to the text of a Facebook post | `update --on facebook --id <post id> --text "<text>"` edits the post. For a new image, use `--repost`. |
| A delete of a post | `delete --on threads --id <post id>`, `--on x` or `--on facebook` |
| A change to an Instagram post, or its delete | Not possible with the CLI. `update` and `delete` give `unsupported` on Instagram. The user does it in the Instagram app. |
| A check of the connection | `status threads` or `status instagram`, with the quotas of the day. `status x` or `status facebook`. |

For example:

```bash
panda-social post --to threads --text "Launch day: the beta is open"
panda-social post --to threads --image https://cdn.example.com/launch.jpg --text "The new dashboard"
panda-social post --to threads --text "Release notes that run past 500 characters" --split
panda-social update --on threads --id 17890000000000001 --text "Launch day: the beta is open to everyone" --repost
panda-social delete --on threads --id 17890000000000001
panda-social post --to x --image ./launch.png --text "Launch day: the beta is open"
panda-social update --on x --id 1880000000000000001 --text "Launch day: the beta is open to everyone"
panda-social delete --on x --id 1880000000000000001
panda-social status x --profile brand-a
panda-social post --to facebook --image https://cdn.example.com/launch.jpg --text "Launch day: the beta is open"
panda-social update --on facebook --id 104000000000001_122000000000001 --text "Launch day: the beta is open to everyone"
panda-social delete --on facebook --id 104000000000001_122000000000001
panda-social post --to instagram --image https://cdn.example.com/launch.jpg --text "Launch day: the beta is open"
panda-social post --to threads,x,facebook --text "Launch day: the beta is open"
```

The post id is the `id` from the output of `post`. On Facebook, it is the Page id and the post number, with an underscore between them. Keep the post id, because the user can tell you to change or delete the post.

## Text, images and threads

- Threads lets a post have 500 characters. It counts an emoji as its UTF-8 bytes: for example, a thumbs-up counts 4.
- X lets a post have 280 characters. Most characters count 1, CJK characters and emoji count 2, and a link counts 23 at all lengths.
- The CLI counts as each platform counts, and rejects a longer text with `text-too-long`. Then give the user two possible solutions: `--split`, or a shorter text.
- `--split` publishes a first post and then replies. Each reply is a reply to the post before it. The CLI divides the text at a paragraph, a line, a sentence or a word.
- If one part of a `--split` thread does not go out, the CLI deletes the parts that it published. `error.details` gives the deleted parts and each part that the CLI did not delete. Tell the user these two lists.
- On Threads, an image is a public `https://` URL to a JPEG or PNG of 8 MB maximum, because Threads downloads the image. A local file must first go on a server. Get the URL of that file from the user.
- On X, an image is a local JPEG, PNG, GIF or WEBP file of 5 MB maximum. The CLI examines the file and uploads it. The CLI rejects a URL. Thus, download a remote image first.
- On Facebook, an image is an https URL that Facebook downloads, or a local JPEG, PNG, GIF, BMP or TIFF file of 10 MB maximum. The CLI examines a local file and uploads it. The text becomes the caption.
- `image-rejected` shows that the platform cannot use the image.
- On Instagram, a post is always an image. The image is a public `https://` URL to a JPEG of 8 MB maximum, with an aspect ratio between 4:5 and 1.91:1. Instagram downloads the image. The text becomes the caption, in one part: 2,200 characters, 30 hashtags and 20 @ tags maximum.
- The CLI rejects a text without an image on Instagram with `missing-image`. Then get an image from the user. `still-processing` shows that Instagram did not complete the image in one minute. The CLI did not publish the post. Tell the user that you can try again.
- `--to threads,x,facebook` publishes the same post on each platform, one after the other. First, each platform must accept the flags. If one platform rejects a flag, the command stops before it posts, and the error gives the name of that platform.
- One image can go to more than one platform only when all of them accept its type: an https URL for Threads, Instagram and Facebook, a local file for X and Facebook. The output is `{"posts":[...]}`, with one item for each platform.
- On `partly-published`, `error.details.published` gives the posts that went out. Do not post to these platforms again. Correct the cause of each error in `error.details.failed`. Then post again only to the platforms in `error.details.failed`.
- Facebook keeps a long text in one post. Thus, `--split` has no effect on Facebook. A Facebook post shows to all persons only after the user publishes the Meta app (step 3 of the setup). If the user cannot see a post when logged out, send the user to step 3 of the setup.
- When a post goes out, the output is `{"platform":"threads","id":"...","url":"..."}`. On X, the link is `https://x.com/i/status/<id>`. On Facebook and Instagram, the link is on facebook.com or instagram.com. A split thread also has `replies`. Give the `url` to the user.
- A `null` url on Threads or Instagram shows that the post is on the platform, but the CLI did not get its link. Tell this to the user, and do not post again.

## Accounts and limits

- The saved Threads token expires 60 days after its last refresh. Each command refreshes the token 30 days after the CLI saved it. Thus, if the CLI runs one time each month, the token does not expire. If the CLI cannot refresh the token, the command writes a warning to stderr and continues.
- On Threads, `unauthorized` shows that the token does not operate. The user generates a new token (step 6 of the setup) and runs `panda-social setup threads` again. `forbidden` shows that the token does not have a permission from step 3. The user adds the permission, generates a new token, and does the setup again.
- Threads lets an account make 250 posts, 1,000 replies and 100 deletes in each period of 24 hours. `status threads` shows the used part. X lets an account make 100 posts and 50 deletes in each period of 15 minutes.
- Instagram lets an account make 50 or 100 API posts in each period of 24 hours. `status instagram` shows the number for the account. On `rate-limited`, wait.
- X keys do not expire. On X, `unauthorized` shows that the user regenerated or revoked the keys. `read-only-keys` shows that the app had no permission to post when the user made the keys. The hint gives the solution, and then the user runs `panda-social setup x` again.
- `credits-depleted` shows that the app has no more credits. The user adds credits in the X developer console.
- `edit-refused` shows that the platform rejected the edit. X edits only for X Premium accounts, a short time after the post, and a maximum of 5 times. Facebook edits only the posts that this Meta app made. Then tell the user that `--repost` is possible, but that it deletes the post. Get a yes first.
- `unsupported` on Facebook shows a new image, which an edit cannot change: use `--repost` again. `duplicate-text` shows that the text is the same as one of the last posts of the account: change the text.
- A Facebook Page token does not expire. On Facebook, `unauthorized` shows that the token does not operate: the password changed, the role on the Page stopped, or the user did not extend the token in step 5. The user makes and extends a new token (steps 4 and 5), and runs `panda-social setup facebook` again.
- `missing-page-task` shows that the role of the user on the Page cannot make posts. `choose-page` gives the Pages of the token, for `--page <id>`.
- An Instagram token expires after 60 days, as a Threads token does. A command renews it 30 days after the CLI saved it. On Instagram, `unauthorized` shows that the token expired, or that the user revoked it. The user generates a new token (step 6) and runs `panda-social setup instagram` again.
- If `PANDA_SOCIAL_THREADS_TOKEN` or `PANDA_SOCIAL_INSTAGRAM_TOKEN` is set, the CLI uses it in place of the saved token, and does not refresh it. If all four `PANDA_SOCIAL_X_` variables are set, they replace the saved X keys. If `PANDA_SOCIAL_FACEBOOK_PAGE_ID` and `PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN` are set, they replace the saved Page.

## Limits of the CLI

- With Instagram Login, the CLI cannot edit or delete an Instagram post. The user does it in the Instagram app.
- The CLI does not read data from the platforms: no feed, replies, mentions or insights. The CLI cannot schedule a post.
- Threads has no edit. Thus, `update` on Threads always deletes the post and publishes it again. Facebook edits only the text.
