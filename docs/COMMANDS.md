# panda-social commands

<!-- Generated from src/presenter/command-registry.ts by scripts/gen-docs.ts. Edit the registry, then run `bun run docs:gen`. -->

Every command prints one JSON line on stdout: `{"ok":true,"data":...}` on success, or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}` on failure, and exits 0 or 1. The `hint` names the next step for the `code`; an optional `details` object carries the ids to act on after a partial failure, such as the parts of a thread that could not be deleted. The interactive setup guide and the logs go to stderr, never to stdout.

| Command | What it does |
| --- | --- |
| [`post`](#post) | Publish a text post, an image, or both, to Threads. |
| [`update`](#update) | Replace a Threads post. Threads has no edit, so --repost deletes it and publishes the new version. |
| [`delete`](#delete) | Delete a Threads post by its id. |
| [`setup`](#setup) | Connect a Threads or X account and save its credentials under a profile. |
| [`status`](#status) | Check a connected Threads or X account: whose credentials they are and whether they still work, with the Threads quotas. |
| [`help-json`](#help-json) | Describe every command, option, example and error code as JSON. Start here. |
| [`docs`](#docs) | Show one command's full documentation as markdown. |

| Flag | What it does |
| --- | --- |
| `panda-social --version` | Print the package name and version. |
| `panda-social --help` | Print the manifest, as help-json does. `<command> --help` prints that command page, as `docs <command>` does. |

## post

Publishes a new post on the account saved in the profile and answers with its id and link. A text over the limit is refused unless --split posts it as a thread of replies. Threads allows 250 posts per 24 hours. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.

### Usage

```bash
panda-social post --to <platform> [--text <text>] [--profile <name>] [--image <url>] [--split]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--to <platform>` | yes | The platform to post to. One of: threads. |
| `--text <text>` | no | The text of the post, quoted when it contains spaces. Required unless --image is given. 500 characters at most on Threads, an emoji counting its UTF-8 bytes (a thumbs-up is 4). |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables, when set, override the saved credentials. |
| `--image <url>` | no | A public https URL to a JPEG or PNG image, 8 MB at most. Threads downloads it itself, so a local file must be hosted first. |
| `--split` | no | Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted. |

### Examples

```bash
# Post from the account saved in the default profile.
panda-social post --to threads --text "Hello from panda"
# Post from the account saved in the brand-a profile.
panda-social post --to threads --text "Launch day" --profile brand-a
# Post an image with a caption.
panda-social post --to threads --image https://cdn.example.com/cat.jpg --text "A cat on the sofa"
# Post a long text as a thread of replies.
panda-social post --to threads --text "Release notes that run past 500 characters" --split
```

### Output

The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}`, plus `"replies":["<id>",...]` for a --split thread.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image URL with --image, or both. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most. Host a local file first, then pass its URL with --image. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes. Shorten the text, or pass --split to post it as a thread of replies. |
| `image-rejected` | Threads could not download or read the image. Check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most, then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `missing-credentials` | Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |

## update

Threads cannot edit a published post, so update refuses unless --repost is given. With --repost it deletes the old post first, then publishes the new text or image as post does: the new post gets a new id and link, and the old one takes its likes and replies with it. If the delete fails, nothing is published; if the publish fails after the delete, the error says the old post is gone.

### Usage

```bash
panda-social update --on <platform> --id <post-id> [--text <text>] [--profile <name>] [--image <url>] [--split] [--repost]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--on <platform>` | yes | The platform the post is on. One of: threads. |
| `--id <post-id>` | yes | The numeric id of the post, as post returned it. |
| `--text <text>` | no | The text of the post, quoted when it contains spaces. Required unless --image is given. 500 characters at most on Threads, an emoji counting its UTF-8 bytes (a thumbs-up is 4). |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables, when set, override the saved credentials. |
| `--image <url>` | no | A public https URL to a JPEG or PNG image, 8 MB at most. Threads downloads it itself, so a local file must be hosted first. |
| `--split` | no | Post a text over the limit as a thread: the first post, then replies, each answering the one before. If a part fails, the parts already published are deleted. |
| `--repost` | no | Delete the post and publish the new version. Without it, Threads updates are refused as unsupported. |

### Examples

```bash
# Replace a post with corrected text.
panda-social update --on threads --id 17890000000000001 --text "Hello from panda, typo fixed" --repost
```

### Output

The new post and the id it replaced: `{"platform":"threads","id":"<new id>","url":"<link or null>","replaced":"<old id>"}`, plus `"replies"` for a --split thread.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `invalid-post-id` | Pass the numeric id that post returned, for example --id 17890000000000001. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `unsupported` | Threads cannot edit a published post. Pass --repost to delete it and publish the new version: it gets a new id and link, and loses its likes and replies. |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image URL with --image, or both. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most. Host a local file first, then pass its URL with --image. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes. Shorten the text, or pass --split to post it as a thread of replies. |
| `image-rejected` | Threads could not download or read the image. Check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most, then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `missing-credentials` | Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |

## delete

Deletes one post from the account saved in the profile. Replies, the other parts of a --split thread included, are posts of their own: delete each id. Threads allows 100 deletes per 24 hours, and the token needs the threads_delete permission.

### Usage

```bash
panda-social delete --on <platform> --id <post-id> [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--on <platform>` | yes | The platform the post is on. One of: threads. |
| `--id <post-id>` | yes | The numeric id of the post, as post returned it. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables, when set, override the saved credentials. |

### Examples

```bash
# Delete one post from the default profile.
panda-social delete --on threads --id 17890000000000001
```

### Output

The deleted post: `{"platform":"threads","id":"<post id>","deleted":true}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `invalid-post-id` | Pass the numeric id that post returned, for example --id 17890000000000001. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |

## setup

On a terminal, walks a first-time user through the one-time steps of the platform (six for Threads, five for X) one at a time, then reads the Threads token or the four X keys without showing them. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin (Threads) or --keys-stdin (X, four lines: API Key, API Key Secret, Access Token, Access Token Secret) it reads them from standard input. The credentials are checked with the platform before they are saved in ~/.panda-social/credentials.json, readable by its owner only; X keys that X reports as read-only are refused. Checking X keys spends about $0.01 of X credits.

### Usage

```bash
panda-social setup <platform> [--token-stdin] [--keys-stdin] [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<platform>` | yes | The platform to connect. One of: threads, x. |
| `--token-stdin` | no | Threads: read the token from standard input instead of asking for it. |
| `--keys-stdin` | no | X: read the four keys from standard input, one per line: API Key, API Key Secret, Access Token, Access Token Secret. |
| `--profile <name>` | no | The profile to save the account under. Defaults to "default". |

### Examples

```bash
# On a terminal, the guided setup; without one, the steps as JSON.
panda-social setup threads
# Save a token piped in on standard input, once Threads confirms it.
panda-social setup threads --token-stdin
# Save a second account under the brand-a profile.
panda-social setup threads --token-stdin --profile brand-a
# On a terminal, the guided X setup; without one, the steps as JSON.
panda-social setup x
# Save four X keys piped in, one per line, once X confirms they can post.
panda-social setup x --keys-stdin
```

### Output

The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`, and for X the same with `"platform":"x"` and a `note` on credits. Without a terminal and without --token-stdin or --keys-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the credentials in the environment instead of saving them: PANDA_SOCIAL_THREADS_TOKEN, or the four PANDA_SOCIAL_X_ variables. |
| `cancelled` | The setup stopped before the credentials were pasted. Run the same setup command again when you have them. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `write-failed` | The credentials could not be saved. Check that your home folder is writable, then run the setup again. |

## status

Asks the platform whose credentials the profile holds. For Threads it also reads the rolling 24-hour quotas for posts, replies and deletes, and a saved token 30 days old or more is refreshed first, as every Threads command does: running status now and then keeps an idle token alive, since Threads lets a token lapse 60 days after its last refresh. For X it reports the access level X states for the keys (null when X states none); X shows neither the credit balance nor the rate windows to these keys, and the check spends about $0.01 of X credits. It never posts.

### Usage

```bash
panda-social status <platform> [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<platform>` | yes | The platform to check. One of: threads, x. |
| `--profile <name>` | no | The profile whose saved account acts. Defaults to "default". A saved Threads token 30 days old or more is refreshed before use. PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables, when set, override the saved credentials. |

### Examples

```bash
# Check the account saved in the default profile.
panda-social status threads
# Check the account saved in the brand-a profile.
panda-social status threads --profile brand-a
# Check the X keys saved in the default profile.
panda-social status x
```

### Output

Threads: `{"platform":"threads","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"token":{"source":"saved","savedAt":"<time>","ageDays":<n>,"expiresAt":"<time, or null until the first refresh>","refreshed":<true when this run refreshed it>},"limits":{"posts":{"used":<n>,"total":250,"windowSeconds":86400},"replies":{...},"deletes":{...}}}`, with `token` `{"source":"environment"}` when PANDA_SOCIAL_THREADS_TOKEN is set. X: `{"platform":"x","profile":"<name>","account":{"userId":"<id>","username":"<username>"},"accessLevel":"read-write","keys":{"source":"saved","savedAt":"<time>"}}`, with `keys` `{"source":"environment"}` when the four PANDA_SOCIAL_X_ variables are set.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `missing-credentials` | Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |

## help-json

The manifest an agent reads on first contact: the output contract, the global flags, every command with its usage line, parameters, examples and error codes, and the next step for every error code. The same manifest ships as docs/commands.json.

### Usage

```bash
panda-social help-json
```

### Parameters

None.

### Examples

```bash
# Read the whole command surface in one call.
panda-social help-json
```

### Output

The manifest: `{"name","version","bin","contract","flags":[...],"commands":[...],"errors":[{"code","hint"}]}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |

## docs

The long form of one command: what it does, its usage line, every parameter, examples ready to paste into a shell, its output and its error codes. docs/COMMANDS.md collects every page.

### Usage

```bash
panda-social docs <command>
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<command>` | yes | The command to document. One of: post, update, delete, setup, status, help-json, docs. |

### Examples

```bash
# Read the post page.
panda-social docs post
```

### Output

The page: `{"command":"<name>","markdown":"<the page>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-command` | Run `panda-social help-json` for every command, or `panda-social docs <command>` for one. |

## Error codes

Every failure carries one of these codes. Its `hint` says what to do next.

| Code | Next step |
| --- | --- |
| `cancelled` | The setup stopped before the credentials were pasted. Run the same setup command again when you have them. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run the setup again for each platform. |
| `credits-depleted` | X has no credits left for this app. Buy more in the developer console (and check its spending limit), then retry. |
| `forbidden` | The credentials lack a permission this action needs. Threads: add threads_delete (to delete) or threads_manage_replies (for --split) under Use cases, Access the Threads API, Customize, generate a new token, and run `panda-social setup threads` again. X: the message gives X's reason; an app outside the pay-per-use package is refused, so check it in the developer console. |
| `image-rejected` | Threads could not download or read the image. Check that the URL opens in a private browser window and serves a JPEG or PNG of 8 MB at most, then retry. |
| `incomplete-environment` | Set all four of PANDA_SOCIAL_X_API_KEY, PANDA_SOCIAL_X_API_SECRET, PANDA_SOCIAL_X_ACCESS_TOKEN and PANDA_SOCIAL_X_ACCESS_SECRET, or none of them to use the saved keys. |
| `invalid-image` | Threads needs a public https URL to a JPEG or PNG image, 8 MB at most. Host a local file first, then pass its URL with --image. |
| `invalid-post-id` | Pass the numeric id that post returned, for example --id 17890000000000001. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect the account with `panda-social setup threads` or `panda-social setup x` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN, or all four PANDA_SOCIAL_X_ variables. |
| `missing-text` | Pass the text of the post with --text (quoted when it contains spaces), an image URL with --image, or both. |
| `network-failed` | The platform could not be reached (graph.threads.net or api.x.com). Check the network, then retry. |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the credentials in the environment instead of saving them: PANDA_SOCIAL_THREADS_TOKEN, or the four PANDA_SOCIAL_X_ variables. |
| `rate-limited` | Threads allows 250 posts and 100 deletes per 24 hours; X allows 100 posts and 50 deletes per 15 minutes, and 75 account checks. Wait, then retry. |
| `rejected` | The platform rejected the request; the message says why. Fix what it names (the text, the image or the post id), then retry. |
| `still-processing` | Threads was still processing the image after 60 seconds, so nothing was published. Retry the post. |
| `text-too-long` | Threads allows 500 characters per post, an emoji counting its UTF-8 bytes. Shorten the text, or pass --split to post it as a thread of replies. |
| `timeout` | The platform did not answer in time, so the post or the delete may still have gone through: check the profile before retrying. |
| `unauthorized` | The platform refused the credentials. Threads: generate a new token (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. X: regenerate the Access Token and Secret in the developer console and run `panda-social setup x` again. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-command` | Run `panda-social help-json` for every command, or `panda-social docs <command>` for one. |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unknown-platform` | Name a platform the command takes, as its examples show: threads for post, update and delete; threads or x for setup and status. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unsupported` | Threads cannot edit a published post. Pass --repost to delete it and publish the new version: it gets a new id and link, and loses its likes and replies. |
| `write-failed` | The credentials could not be saved. Check that your home folder is writable, then run the setup again. |
