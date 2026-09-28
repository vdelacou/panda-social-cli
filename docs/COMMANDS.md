# panda-social commands

<!-- Generated from src/presenter/command-registry.ts by scripts/gen-docs.ts. Edit the registry, then run `bun run docs:gen`. -->

Every command prints one JSON line on stdout: `{"ok":true,"data":...}` on success, or `{"ok":false,"error":{"code":"...","message":"...","hint":"..."}}` on failure, and exits 0 or 1. The `hint` names the next step for the `code`; an optional `details` object carries the ids to act on after a partial failure, such as the parts of a thread that could not be deleted. The interactive setup guide and the logs go to stderr, never to stdout.

| Command | What it does |
| --- | --- |
| [`post`](#post) | Publish a text post to Threads. |
| [`setup`](#setup) | Connect a Threads account and save its token under a profile. |
| [`help-json`](#help-json) | Describe every command, option, example and error code as JSON. Start here. |
| [`docs`](#docs) | Show one command's full documentation as markdown. |

| Flag | What it does |
| --- | --- |
| `panda-social --version` | Print the package name and version. |
| `panda-social --help` | Print the manifest, as help-json does. `<command> --help` prints that command page, as `docs <command>` does. |

## post

Publishes the text as a new post on the account saved in the profile, and answers with the post id and its link. Threads allows 500 characters and 250 posts per 24 hours. Publishing is never retried: a post that timed out may still have gone out, so check the profile before posting again.

### Usage

```bash
panda-social post --to <platform> --text <text> [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `--to <platform>` | yes | The platform to post to. One of: threads. |
| `--text <text>` | yes | The text of the post, quoted when it contains spaces. 500 characters at most on Threads. |
| `--profile <name>` | no | The profile whose saved account posts. Defaults to "default". PANDA_SOCIAL_THREADS_TOKEN, when set, overrides the saved token. |

### Examples

```bash
# Post from the account saved in the default profile.
panda-social post --to threads --text "Hello from panda"
# Post from the account saved in the brand-a profile.
panda-social post --to threads --text "Launch day" --profile brand-a
```

### Output

The new post: `{"platform":"threads","id":"<post id>","url":"<link, or null when Threads did not return one>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Threads is the only platform so far: pass --to threads, or run `panda-social setup threads`. |
| `missing-text` | Pass the text of the post with --text, quoted when it contains spaces. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect an account with `panda-social setup threads` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run `panda-social setup threads`. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `unauthorized` | Threads refused the token. Generate a new one (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. |
| `rate-limited` | Threads allows 250 posts per 24 hours. Wait, then retry. |
| `rejected` | Threads rejected the request. Check the text (500 characters at most), then retry. |
| `network-failed` | graph.threads.net could not be reached. Check the network, then retry. |
| `timeout` | Threads did not answer in time. The post may still have gone out: check the profile before retrying. |

## setup

On a terminal, walks a first-time user through the six one-time steps (a Meta developer account, an app with the Threads API, its permissions, a tester invitation, the token) one at a time, then reads the token without showing it. Without a terminal it answers with the same steps as JSON, for an agent to relay to its human, and the command that finishes the setup. With --token-stdin it reads the token from standard input. Every token is checked with Threads before it is saved in ~/.panda-social/credentials.json, readable by its owner only.

### Usage

```bash
panda-social setup <platform> [--token-stdin] [--profile <name>]
```

### Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `<platform>` | yes | The platform to connect. One of: threads. |
| `--token-stdin` | no | Read the token from standard input instead of asking for it. |
| `--profile <name>` | no | The profile to save the account under. Defaults to "default". |

### Examples

```bash
# On a terminal, the guided setup; without one, the steps as JSON.
panda-social setup threads
# Save a token piped in on standard input, once Threads confirms it.
panda-social setup threads --token-stdin
# Save a second account under the brand-a profile.
panda-social setup threads --token-stdin --profile brand-a
```

### Output

The connected account, `{"platform":"threads","profile":"<name>","userId":"<id>","username":"<username>"}`. Without a terminal and without --token-stdin, the guide instead: `{"platform":"threads","profile":"<name>","steps":[{"step":1,"title":"...","actions":["..."],"url":"..."}],"finish":"<the command that completes the setup>"}`.

### Errors

| Code | Next step |
| --- | --- |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-platform` | Threads is the only platform so far: pass --to threads, or run `panda-social setup threads`. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the token in PANDA_SOCIAL_THREADS_TOKEN instead of saving it. |
| `cancelled` | The setup stopped before a token was pasted. Run `panda-social setup threads` again when you have it. |
| `unauthorized` | Threads refused the token. Generate a new one (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. |
| `rate-limited` | Threads allows 250 posts per 24 hours. Wait, then retry. |
| `rejected` | Threads rejected the request. Check the text (500 characters at most), then retry. |
| `network-failed` | graph.threads.net could not be reached. Check the network, then retry. |
| `timeout` | Threads did not answer in time. The post may still have gone out: check the profile before retrying. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run `panda-social setup threads`. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `write-failed` | The token could not be saved. Check that your home folder is writable, then run the setup again. |

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
| `<command>` | yes | The command to document. One of: post, setup, help-json, docs. |

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
| `cancelled` | The setup stopped before a token was pasted. Run `panda-social setup threads` again when you have it. |
| `corrupt` | The credentials file is not valid. Fix or delete ~/.panda-social/credentials.json, then run `panda-social setup threads`. |
| `invalid-profile` | Use lowercase letters, digits, - and _, starting with a letter or digit, 40 characters at most. Example: --profile brand-a |
| `missing-credentials` | Connect an account with `panda-social setup threads` (add `--profile <name>` for another profile), or set PANDA_SOCIAL_THREADS_TOKEN. |
| `missing-text` | Pass the text of the post with --text, quoted when it contains spaces. |
| `network-failed` | graph.threads.net could not be reached. Check the network, then retry. |
| `no-home` | Set HOME (USERPROFILE on Windows), or pass the token in PANDA_SOCIAL_THREADS_TOKEN instead of saving it. |
| `rate-limited` | Threads allows 250 posts per 24 hours. Wait, then retry. |
| `rejected` | Threads rejected the request. Check the text (500 characters at most), then retry. |
| `timeout` | Threads did not answer in time. The post may still have gone out: check the profile before retrying. |
| `unauthorized` | Threads refused the token. Generate a new one (Meta app dashboard, Use cases, Access the Threads API, Settings, User Token Generator) and run `panda-social setup threads` again. |
| `unexpected-argument` | Quote any value that contains spaces, for example --text "Hello from panda". |
| `unknown-command` | Run `panda-social help-json` for every command, or `panda-social docs <command>` for one. |
| `unknown-option` | Run `panda-social docs <command>` for the options that command takes. |
| `unknown-platform` | Threads is the only platform so far: pass --to threads, or run `panda-social setup threads`. |
| `unreadable` | The credentials file could not be read. Check that ~/.panda-social/credentials.json belongs to you. |
| `write-failed` | The token could not be saved. Check that your home folder is writable, then run the setup again. |
