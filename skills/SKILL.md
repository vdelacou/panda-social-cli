---
name: panda-social
description: >
  Publish, replace and delete posts on the user's own Threads account through the local
  panda-social CLI, as text, an image by public URL, or a long text split into a thread of
  replies; check the connected account, its token and the day's quotas; and walk a first-time
  user through connecting Threads or X. Use it whenever the user asks to post, share, publish,
  thread, reword, repost or delete something on Threads, or asks whether their Threads or X
  connection works or how many posts they have left today. Do NOT use it to read a feed,
  replies, mentions or insights, to schedule a post for later, or to post on X, Facebook or
  Instagram, which the CLI does not do yet.
---

# Post to Threads with panda-social

`panda-social` publishes to the user's own Threads account with the token they connected once. Every command prints one JSON line on stdout, `{"ok":true,"data":...}` or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}`, and exits 0 or 1; warnings and logs go to stderr. Your job: turn the request into the right command, get the user's approval for anything that publishes or deletes, run it, and report the outcome in plain words.

## Ground rules

- The user approves every post before it exists. Show the exact text, and the image URL when there is one, and wait for a yes before running `post`: a post is public the moment the command succeeds. Text the user dictated word for word can go out as given.
- Deleting cannot be undone, and `update --repost` deletes too: it publishes the new version as a new post with a new id and link, and the old post's likes and replies are gone. Name the post you are about to remove, and get a yes.
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
| A text post | `post --to threads --text "<text>"` |
| An image post, with or without a caption | `post --to threads --image <https URL> --text "<caption>"` |
| A text longer than 500 characters | `post --to threads --text "<text>" --split` |
| A post's wording changed | `update --on threads --id <post id> --text "<text>" --repost` |
| A post deleted | `delete --on threads --id <post id>` |
| To know the connection works, and the quotas | `status threads` |
| To know the X connection works | `status x` |

For example:

```bash
panda-social post --to threads --text "Launch day: the beta is open"
panda-social post --to threads --image https://cdn.example.com/launch.jpg --text "The new dashboard"
panda-social post --to threads --text "Release notes that run past 500 characters" --split
panda-social update --on threads --id 17890000000000001 --text "Launch day: the beta is open to everyone" --repost
panda-social delete --on threads --id 17890000000000001
panda-social status threads --profile brand-a
```

The post id is the `id` that `post` answered; keep it if the user may want to change or delete the post later.

## Text, images and threads

- Threads allows 500 characters per post and counts an emoji as its UTF-8 bytes, so a thumbs-up costs 4. The CLI counts the same way and refuses a longer text with `text-too-long`; offer `--split` or a shorter text.
- `--split` posts a first post and then replies, each answering the one before, cut at a paragraph, line, sentence or word break. If a part fails, the parts already out are deleted, and `error.details` lists what was deleted and anything left behind: tell the user about both.
- An image is a public `https://` URL to a JPEG or PNG of 8 MB at most, because Threads downloads it itself. A file on the user's machine has to be hosted first; ask them where. `image-rejected` means Threads could not fetch or read the image.
- A success answers `{"platform":"threads","id":"...","url":"..."}`, plus `replies` for a split thread: give the user the `url`. A `null` url means the post is up but its link could not be read back; say so, and do not post it again.

## Token and quotas

- The saved token lasts 60 days after its last refresh, and every command refreshes it once it is 30 days old, so a CLI that runs at least once a month keeps working. A refresh that fails leaves a warning on stderr and the command still runs.
- `unauthorized` means the token no longer works: the user generates a new one (step 6 of the setup) and runs `panda-social setup threads` again. `forbidden` means it lacks a permission from step 3: they add it, generate a new token, and run the setup again.
- Threads allows 250 posts, 1,000 replies and 100 deletes per rolling 24 hours; `status threads` reports what is used. On `rate-limited`, wait.
- `PANDA_SOCIAL_THREADS_TOKEN`, when set, is used instead of the saved token and is never refreshed.

## Known limitations

- Posting works on Threads only for now: X can be connected and checked, and Facebook and Instagram come later.
- Nothing is read back: no feed, replies, mentions or insights. No scheduling.
- Threads has no edit, so `update` always deletes and republishes.
