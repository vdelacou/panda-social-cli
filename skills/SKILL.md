---
name: panda-social
description: >
  Publish, edit, replace and delete posts on the user's own Threads and X accounts through
  the local panda-social CLI, as text, an image (a public URL on Threads, a local file on X),
  or a long text split into a thread of replies; check a connected account and its limits;
  and walk a first-time user through connecting Threads or X. Use it whenever the user asks
  to post, share, publish, tweet, thread, reword, edit, repost or delete something on Threads
  or X, or asks whether their Threads or X connection works or how many posts they have left
  today. Do NOT use it to read a feed, replies, mentions or insights, to schedule a post for
  later, or for Facebook or Instagram, which the CLI does not do yet.
---

# Post to Threads and X with panda-social

`panda-social` publishes to the user's own Threads and X accounts with the credentials they connected once. Every command prints one JSON line on stdout, `{"ok":true,"data":...}` or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}`, and exits 0 or 1; warnings and logs go to stderr. Your job: turn the request into the right command, get the user's approval for anything that publishes or deletes, run it, and report the outcome in plain words.

## Ground rules

- The user approves every post before it exists. Show the exact text, and the image when there is one, and wait for a yes before running `post`: a post is public the moment the command succeeds. Text the user dictated word for word can go out as given.
- Deleting cannot be undone, and `update --repost` deletes too: it publishes the new version as a new post with a new id and link, and the old post's likes and replies are gone. Name the post you are about to remove, and get a yes.
- On X, every post spends the user's prepaid credits: $0.015, and $0.20 when its text contains a link. Say so before posting a link or a long `--split` thread.
- Never retry a publish on your own. After a `timeout`, the post may already be up: ask the user to look at their profile before anything is posted again.
- Keep the token and the X keys out of the conversation. The user pastes them into their own terminal, never into the chat; never ask for them, and never echo one you see.
- A failure names its own fix: follow `error.hint`, or relay it, before trying again. Tell the user what happened in plain words; error codes and command names are for you.
- `panda-social help-json` describes every command, option, example and error code in one JSON document; `panda-social docs <command>` gives one command's page. Look there for anything this skill does not cover.

## Setup (once)

```bash
panda-social --version
panda-social status threads
```

If the command is missing, the user installs it with `npm i -g panda-social-cli` (Node 20 or later, or Bun) once it is published; until then they run it from a clone of the repository with `bun run src/main.ts` in place of `panda-social`.

`status threads` answering `missing-credentials` means Threads is not connected yet:

1. Run `panda-social setup threads`. Without a terminal, as an agent runs it, it answers the six setup steps as JSON: `data.steps`, each with a `title`, its `actions` and often a `url`.
2. Relay the steps one at a time, and wait for the user to finish each. The same steps, with what each permission is for and the usual failures, are in `docs/setup/threads.md` in the panda-social-cli repository.
3. After step 6, ask the user to run `panda-social setup threads` in their own terminal, press Enter past the six steps they have just done, and paste the token at the prompt, where it does not show. The CLI saves it only once Threads confirms whose it is.
4. Run `panda-social status threads` again: `"ok":true` with their username means it worked.

Connecting X runs the same way with `panda-social setup x`: five steps as JSON to relay one at a time (`docs/setup/x.md` has them with the prices and the usual failures), then the user runs `panda-social setup x` in their own terminal and pastes the four keys where they do not show. X has no free tier: before step 2, tell the user that every request spends their prepaid credits, about $0.01 for the setup's own check. `panda-social status x` then answers with their username.

For several accounts, the same commands take `--profile <name>` (lowercase letters, digits, `-` and `_`), for example `--profile brand-a`.

## What to run

| The user wants | Command |
|---|---|
| A text post | `post --to threads --text "<text>"`, or `--to x` |
| An image post, with or without a caption | `post --to threads --image <https URL> --text "<caption>"`; on X, `post --to x --image <local file> --text "<caption>"` |
| A text over the limit (500 on Threads, 280 on X) | the same with `--split` |
| A Threads post's wording changed | `update --on threads --id <post id> --text "<text>" --repost` |
| An X post's wording changed | `update --on x --id <post id> --text "<text>"` edits it in place (X Premium); with `--repost` it deletes and republishes |
| A post deleted | `delete --on threads --id <post id>`, or `--on x` |
| To know the connection works | `status threads`, with the day's quotas, or `status x` |

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
```

The post id is the `id` that `post` answered; keep it if the user may want to change or delete the post later.

## Text, images and threads

- Threads allows 500 characters per post and counts an emoji as its UTF-8 bytes, so a thumbs-up costs 4. X allows 280 and counts its own way: most characters 1, CJK characters and emoji 2, a link 23 however long. The CLI counts as each platform does and refuses a longer text with `text-too-long`; offer `--split` or a shorter text.
- `--split` posts a first post and then replies, each answering the one before, cut at a paragraph, line, sentence or word break. If a part fails, the parts already out are deleted, and `error.details` lists what was deleted and anything left behind: tell the user about both.
- On Threads, an image is a public `https://` URL to a JPEG or PNG of 8 MB at most, because Threads downloads it itself; a file on the user's machine has to be hosted first, so ask them where. On X, it is a local JPEG, PNG, GIF or WEBP file of 5 MB at most, which the CLI checks and uploads; a URL is refused, so download a remote image first. `image-rejected` means the platform could not use the image.
- A success answers `{"platform":"threads","id":"...","url":"..."}`, or the same with `"platform":"x"` and an `https://x.com/i/status/<id>` link, plus `replies` for a split thread: give the user the `url`. A `null` url on Threads means the post is up but its link could not be read back; say so, and do not post it again.

## Accounts and limits

- The saved Threads token lasts 60 days after its last refresh, and every command refreshes it once it is 30 days old, so a CLI that runs at least once a month keeps working. A refresh that fails leaves a warning on stderr and the command still runs.
- On Threads, `unauthorized` means the token no longer works: the user generates a new one (step 6 of the setup) and runs `panda-social setup threads` again. `forbidden` means it lacks a permission from step 3: they add it, generate a new token, and run the setup again.
- Threads allows 250 posts, 1,000 replies and 100 deletes per rolling 24 hours; `status threads` reports what is used. X allows 100 posts and 50 deletes per 15 minutes. On `rate-limited`, wait.
- X keys never expire. On X, `unauthorized` means they were regenerated or revoked, and `read-only-keys` that the app could not post when they were made: the hint gives the fix, then the user runs `panda-social setup x` again. `credits-depleted` means the app's credits are spent: the user buys more in the X developer console.
- `edit-refused` means X declined the edit: it edits only for X Premium accounts, shortly after posting and 5 times at most. Offer `--repost`, which deletes the post, so get a yes first. `duplicate-text` means the text repeats one of the account's recent posts: change it.
- `PANDA_SOCIAL_THREADS_TOKEN`, when set, is used instead of the saved Threads token and is never refreshed; the four `PANDA_SOCIAL_X_` variables, when all set, replace the saved X keys.

## Known limitations

- Threads and X only for now; Facebook and Instagram come later.
- Nothing is read back: no feed, replies, mentions or insights. No scheduling.
- Threads has no edit, so `update` there always deletes and republishes.
