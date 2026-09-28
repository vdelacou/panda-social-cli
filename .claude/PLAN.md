# PLAN: panda-social-cli v1

Current task: phase 3, X (2.6 waits for the user's real token). Resume from the first unchecked box of phase 3.

## What we are building

A Bun/TypeScript CLI and library, published to npm as `panda-social-cli` (bin `panda-social`, Node 20+ and Bun), that lets an AI agent post text, an image, or text with an image to Threads, X, Facebook Pages and Instagram, update and delete those posts, and walk a first-time human through each platform's setup. Docs are written for agents first.

## Decisions (2026-09-28, with the user)

| # | Decision | Why |
|---|---|---|
| D1 | Direct platform APIs, no aggregator (Ayrshare starts at $149/month for one profile) | panda-social-agent proves the direct path on all four platforms |
| D2 | Every channel works alone: no platform is a prerequisite for another | a user may only want Instagram |
| D3 | Images: an `https://` URL passes through; X and Facebook take the local file directly; a configured Facebook Page hosts a local file for Instagram and Threads (`published=false`, `temporary=true`, auto-deleted by Meta after ~24h); otherwise a local file on Instagram or Threads fails with a hint | Instagram and Threads accept only a public `image_url` in 2026; no third-party host |
| D4 | `update` edits natively where the platform allows it (Facebook posts made by this app, X Premium within 1h), and `update --repost` deletes and republishes on request | Threads and Instagram have no edit API; X edit needs Premium |
| D5 | Instagram: Instagram Login by default (no Page, no delete); Facebook Login as a setup option for Page owners (enables delete) | delete exists only under Facebook Login (added 2025-12-03) |
| D6 | One npm package for Bun and Node 20+: `bun build --target=node`, runtime adapters where Bun and Node differ | the ask-marcel-office-cli pattern |
| D7 | Command registry drives the CLI, the library, the generated docs and later MCP; JSON envelope with a `hint` on every error; `help-json`, `docs <command>`, `SKILL.md` | the ask-marcel-office-cli pattern, emerging at the third command rather than in the skeleton |
| D8 | Credentials in `~/.panda-social/credentials.json` (0600) per `--profile`, env vars override; Meta tokens refresh on a rolling 30-day schedule | agents and CI run headless; the user runs several brands |
| D9 | X uses the four OAuth 1.0a keys behind a swappable signer | simplest setup; X says 1.0a is being retired, no date yet |
| D10 | `post --to a,b,c` posts to each platform independently and reports per platform; over-limit text fails unless `--split` builds a reply chain, rolled back if it breaks midway | panda-social-agent's chain and rollback policy |
| D11 | Graph API pinned to v26.0 in one module; Threads v1.0 | v26.0 is current (2026-07-29); panda-social-agent pins v23.0 |
| D12 | X requests are signed by `oauth-1.0a` (MIT, no dependencies) with node:crypto HMAC-SHA1 behind one signer function; HTTP stays on `fetch` with a deadline | rule 33 wants a vetted library, not a hand-rolled signature; `twitter-api-v2` does its own HTTP (no deadline we control) and panda-social-agent still uploads through the sunset v1.1 endpoint with it |
| D13 | X text is counted by twitter-text's config v3, written in the domain: NFC, code points 0-4351 and three punctuation ranges weigh 1, everything else 2, an emoji 2, an http(s) link 23 | the `twitter-text` package pulls core-js and the Babel runtime and was last published in 2020; a bare domain X links is counted as plain text, a known gap X reports if it matters |
| D14 | On X, `--image` is a local JPEG, PNG, GIF or WEBP file of 5 MB at most, recognised by its first bytes before anything is sent, then uploaded as base64 JSON to `POST /2/media/upload`; an https URL is refused with a hint to download it first | D3; the byte check stops a misled agent from uploading a key file as an "image" |
| D15 | X keys can come from four environment variables for CI (`PANDA_SOCIAL_X_API_KEY`, `_API_SECRET`, `_ACCESS_TOKEN`, `_ACCESS_SECRET`): all four, or an error naming the missing ones; the keys never expire, so nothing refreshes them | the Threads token's `PANDA_SOCIAL_THREADS_TOKEN`, for four values |
| D16 | `status x` shows the account and the keys' access level, not a quota | OAuth 1.0a keys read neither the credit balance (`/2/usage/credits` wants an OAuth 2.0 or app-only token) nor the rate windows |

## Platform facts that shape the code (verified 2026-09-28)

- Threads: text up to 500 chars (one call with `auto_publish_text=true`); images by public URL only (JPEG/PNG, 8 MB); no edit; delete with `threads_delete`, 100 per 24h; 250 posts per 24h; token from the dashboard's User Token Generator for a Threads Tester; 60-day tokens refreshed with `th_refresh_token` (token at least 24h old).
- Threads, checked for 2.4: `GET /refresh_access_token?grant_type=th_refresh_token` needs an unexpired token at least 24h old with `threads_basic` and answers `access_token`, `token_type`, `expires_in` (60 days from the refresh); it reads the token from the `Authorization` header (a dummy token answered "Cannot parse access token", no token "Invalid OAuth 2.0 Access Token"), so the token stays out of the URL. `GET /{threads-user-id}/threads_publishing_limit?fields=quota_usage,config,reply_quota_usage,reply_config,delete_quota_usage,delete_config` answers `data[0]` with each usage and a `{quota_total, quota_duration}` config (250 posts, 1,000 replies, 100 deletes per 86,400 s); `me` in that path is not documented, so the id from `/me` is used. `GET /debug_token` gives expiry and scopes but takes the inspected token in the query string, so it is not used. A path is checked only after the token, so a dummy-token probe cannot prove a path exists: the live QA in 2.6 must.
- X: pay-per-use credits only ($0.015 a post, about $0.015 more per image, $0.20 with a URL); 280 weighted chars; `POST /2/media/upload` for images (v1.1 upload sunset 2025-06-09); edit only for Premium within 1h via `edit_options.previous_post_id`; delete 50 per 15 min; OAuth 1.0a keys never expire.
- X, checked for phase 3 (docs.x.com and the OpenAPI spec v2.168): `POST /2/tweets` (`text`, `media.media_ids` 1 to 4, `reply.in_reply_to_tweet_id`, `edit_options.previous_post_id`), `DELETE /2/tweets/{id}` (`data.deleted`), `GET /2/users/me` and `POST /2/media/upload` (JSON with base64 `media` and `media_category: tweet_image`, or multipart; answers `data.id`) all accept OAuth 1.0a user context; per user, 100 posts and 50 deletes per 15 min, `/2/users/me` 75, uploads 500; pricing: $0.015 a post, $0.200 a post with a URL, $0.010 a delete, $0.010 per user read; out of credits answers 402 `CreditsDepleted`, and an app outside the pay-per-use package or with read-only keys answers 403; editing needs X Premium, within an hour, up to 5 edits; images JPG, PNG, GIF, WEBP up to 5 MB; apps are made at console.x.com, and keys generated before the app was set to Read and write stay read-only.
- Facebook: Page only; text via `/{page}/feed`, photo via multipart `/{page}/photos`; edit via `POST /{post}` only for posts made by the same app; delete via `DELETE /{post}` (one doc says restricted, to be probed live); posts from a Development-mode app are visible to app roles only until the app is published.
- Instagram: professional account; `image_url` only, JPEG, 8 MB, aspect 4:5 to 1.91:1; no text-only posts; no caption edit; delete only under Facebook Login with `instagram_manage_contents`; 50 or 100 posts per 24h (docs disagree, read `content_publishing_limit` at runtime).

## Phase 1: scaffold and the Threads walking skeleton

- [x] 1.0 Atelier installed at project scope and `CLAUDE.md` points at it (commits 3779db9, 069a2da).
- [x] 1.1 Toolchain: `package.json`, `tsconfig.json`, `eslint.config.js`, `bunfig.toml`, `.gitignore`, `.vscode/`, MIT `LICENSE` with a neutral holder. Done when `bun install` is clean and `check-package-json.sh` passes.
- [x] 1.2 Gates: the asset scripts in `scripts/`, `.githooks/pre-commit` and `commit-msg`, `stryker.conf.json`, `ci.yml`, `mutation.yml`, `audit.yml`. Done when every gate is seen red on a planted violation and green after the revert. (13 of 13 red with their own message; mutation 100 on format-error.)
- [x] 1.3 Memory and docs: `.claude/LESSONS.md` header, README with install steps, `git config core.hooksPath .githooks` and a `## Verify` block. Done when `check-docs.sh` passes. (Green once 1.4 added the first infra file: the generated preload is comment-only on an empty tree and unicorn's `no-empty-file` rejects it, an upstream atelier gap.)
- [x] 1.4 Walking skeleton: `panda-social post --to threads --text "..."` from argv to the Threads API and back as a JSON envelope, through use-case, port, adapter (with a deadline) and presenter. Done when the proposed tests were confirmed, seen red, then green, and lint, typecheck, coverage (100/100/80) and mutation (90) pass. (22 tests, mutation 100 on 34 mutants; a live call with an invalid token got OAuth code 190 "Cannot parse access token", so Threads reads the `Authorization: Bearer` header.)
- [x] 1.5 Packaging: `bun build --target=node` to `dist/cli.js` and `dist/index.js`, `.d.ts` emit, shebang. Done when the built CLI answers under Bun and under Node, and `bun pm pack --dry-run` lists only `dist/`, README, LICENSE and package.json. (`smoke:dist` passes under both and fails on a missing shebang or library bundle; the packed tarball typechecks in a `nodenext` consumer with `skipLibCheck: false`; `--version` moved to 2.2 with the registry.)
- [x] 1.6 Landing: commit slices of at most 10 files and 300 lines, each approved by the user before commit and before push. (Every step since lands the same way; CI's `check-commit-range.sh` holds each pushed commit to the same limits, with no bypass.)

## Phase 2: Threads, complete

- [x] 2.1 `setup threads`: step-by-step guide on a terminal, the same steps as JSON without one (agents), `--token-stdin`, verify with `GET /me`, store per `--profile` in `~/.panda-social/credentials.json` (0600 in a 0700 folder); `post` reads it, `PANDA_SOCIAL_THREADS_TOKEN` overrides. Done when an invalid token is refused with a hint and a valid one is stored 0600. (47 tests, mutation 100 on 91 mutants; a pseudo-terminal run showed the 6 steps, kept the token off screen and refused a bad token live. A successful save with a real token is still to be seen.)
- [x] 2.2 Command registry, `help-json`, `docs <command>`, generated `docs/COMMANDS.md` and `commands.json`, the error-hint table. (One file per command under `src/presenter/commands/`; the registry drives the parser, which now refuses unknown options and stray arguments, `help-json`, `docs`, `--version` and both generated files. 61 tests, mutation 100 on 91 mutants; every documented example runs through the real parser, and the error table is checked against the codes the commands declare, both ways. `docs:check` runs in CI and was seen red on registry drift and on a missing file.)
- [x] 2.3 `post` with an image URL, `delete`, `update --repost`, `--split` reply chains with rollback. (101 tests, mutation 100 on 306 mutants. Text is counted the way Threads counts it, an emoji as its UTF-8 bytes, and split at a paragraph, line, sentence or word break; an image goes through a media container checked every 1.5 s for up to 60 s; a thread that breaks midway is deleted newest first and the error's `details` lists what stayed; `update --repost` deletes before it publishes. Landed as 16 slices, each green on its own. The publishing-limit readout moved to 2.4.)
- [x] 2.4 Token refresh (`th_refresh_token`), `status` command (who am I, token age, the publishing-limit readout). (122 tests, mutation 100 on 396 mutants. Every Threads command refreshes a saved token once it is 30 days old, with the token in the header; a refresh or a save that fails leaves a warning on stderr and never blocks the command. `status threads` shows the account, the token (source, saved at, age, expiry once a refresh gave it, refreshed now or not) and the posts, replies and deletes quotas. Landed as 9 slices. The header-token refresh and the `/{user-id}/threads_publishing_limit` path rest on Meta's docs and a dummy-token probe: 2.6 checks both with a real token.)
  - [x] 2.4a Domain: a `ThreadsUserId` brand (digits, it goes into a URL path); saved Threads credentials gain an optional `expiresAt`; a saved token is due for renewal once it is 30 days old (D8, as panda-social-agent does at startup).
  - [x] 2.4b Port and adapter: `refreshToken()` (token in the header, a deadline like every call), `publishingLimits(userId)` (posts, replies, deletes: used, total, window), and `whoAmI` checks the id before it can reach a URL.
  - [x] 2.4c Use-cases: load the profile's saved token and renew it first when due, where a failed renewal or a failed save never blocks the command (a warning on stderr instead); `status` reports the account, the token (source, saved at, age in days, expiry once known, renewed now or not) and the three quotas.
  - [x] 2.4d CLI: `panda-social status threads [--profile <name>]`; every Threads command loads its token through the renewal; docs regenerated; README and the profile option say a saved token renews itself.
  - Done when: the proposed tests were confirmed, seen red, then green; lint, typecheck, coverage tiers and mutation 100 on the new domain and use-case code pass; every slice is at most 10 files and 300 lines and green on its own; the live renewal with a real token is left to 2.6 and said so.
- [x] 2.5 `docs/setup/threads.md` with the screenshot shot list, `skills/SKILL.md`. (The guide carries the six steps in the CLI's words, ten screenshot placeholders and their shot list; the skill's description is 651 characters. `docs:check` now runs `scripts/check-guides.ts`, seen red for a refused command line in each page, a setup action and URL missing from the guide, and a wrong skill name with an overlong description. The screenshots themselves need the user's logged-in consoles and are still to take.)
  - [x] 2.5a The setup guide for a first-time human: the six steps in the CLI's own words, what each permission is for, a screenshot placeholder per step and a shot list (file, page, what it shows, what to blur, the token always), the finish in the user's own terminal so the token never passes through a chat, a check with `status threads`, and the known failures with their fixes.
  - [x] 2.5b The agent skill, in the ask-marcel-office-cli shape (an orchestrator that defers details to `help-json` and `docs <command>`): when to use it and when not, the user approves every post before it exists, no blind retry after a timeout, the setup handoff, a command map with concrete examples, what `--split`, images, `details` and a null `url` mean, the token and the quotas, the limits. The skill ships in the repository, as ask-marcel's does; packaging it with npm is a release question (phase 8).
  - [x] 2.5c `docs:check` also fails when a `panda-social` command line in either page is one the parser refuses, when a setup step or action from the code is missing from the guide, or when the skill's frontmatter lacks its name or runs past 1,024 characters; each check seen red on a planted violation.
  - Done when: both pages read end to end against the code, the extended `docs:check` passes and was seen red for each of its three reasons, the README links both pages, and every gate passes.
- [ ] 2.6 Live QA script the user runs with a real token: post, read back, delete, `status`, and the refresh of a token at least a day old.

## Phase 3: X

- [x] 3.1 `setup x` (four keys, verify with `GET /2/users/me`, check `x-access-level: read-write`), credits warning. (The 26 confirmed tests were seen red, 12 failing and 5 erroring, then green, and one confirmed assertion was added for two mutation survivors in the guide; mutation is 100 on the domain and use-cases. `x-access-level` is in neither docs.x.com nor the OpenAPI spec (2026-09-28), so without it the level reads null, `setup x` saves the keys, and read-only keys surface at the first post as `read-only-keys`. X's pages disagree on the button (New App, Create App), so the steps say "Create a new app". `docs:check` now holds `docs/setup/x.md` to X_SETUP_STEPS, seen red for a refused command line and a missing action. Landed as 13 slices, each green. A live `setup x` with real keys is left to the QA step, as are the X console screenshots.)
  - [x] 3.1a Domain: X credentials in the profile (the four keys, the account id and username, when they were saved).
  - [x] 3.1b Signer and adapter: `oauth-1.0a` with HMAC-SHA1 (D12); `whoAmI` from `GET /2/users/me` with the `x-access-level` header; the X failures as their own kinds (unauthorized, credits-depleted on 402, read-only keys, forbidden, rate-limited, rejected, network-failed, timeout).
  - [x] 3.1c Use-cases: connect X (verify, refuse read-only keys with the fix, save), the guided terminal setup (the steps, then four hidden answers), `status x`.
  - [x] 3.1d CLI: `setup x [--keys-stdin] [--profile <name>]` (the steps as JSON without a terminal), `status x`, the environment keys (D15), `docs/setup/x.md` with its shot list and the credits warning, docs regenerated.
  - Done when: the proposed tests were confirmed, seen red, then green; every gate passes, mutation 100 on the new domain and use-case code; slices of at most 10 files and 300 lines, each green; a live `setup x` with real keys is left to the QA step and said so.
- [ ] 3.2 `post` text and image (`/2/media/upload`), weighted 280-char count, `delete`, `update` native for Premium, `--repost`, 402 and 403 hints.
  - [ ] 3.2a Domain: the X weighted length (D13) and `--split` for X on a splitter shared with Threads; X post ids; image files recognised by their first bytes and size; local image paths.
  - [ ] 3.2b Adapter: `POST /2/tweets` (text, media, reply, edit), `DELETE /2/tweets/{id}`, the media upload (D14), 402 and 403 told apart by X's own detail (credits, read-only keys, duplicate text).
  - [ ] 3.2c Use-cases: publish on X (image first, then the post, then the reply chain, rolled back newest first if it breaks), delete, update (a native edit, or `--repost`; a refused edit says to use `--repost`).
  - [ ] 3.2d CLI: `post --to x`, `update --on x`, `delete --on x`, the image and the id read per platform, hints that fit both platforms, the skill and the README.
  - Done when: as 3.1, plus a text of exactly 280 weighted characters goes out whole and 281 is refused or split.

## Phase 4: Facebook

- [ ] 4.1 `setup facebook` (Explorer token, `fb_exchange_token`, pick the Page, never-expiring Page token, `CREATE_CONTENT` check, publish-the-app step).
- [ ] 4.2 `post` text and photo (multipart), `update` native, `delete`, `--repost`.
- [ ] 4.3 Temporary image host for Instagram and Threads, after a live spike proves both accept the unpublished photo's URL.

## Phase 5: Instagram

- [ ] 5.1 `setup instagram` with the Instagram Login default and the Facebook Login option.
- [ ] 5.2 `post` image with caption (JPEG, size and aspect checks), `delete` under Facebook Login, `unsupported` with a hint otherwise, `update --repost` where delete exists.

## Phase 6: cross-posting and polish

- [ ] 6.1 `post --to` several platforms with per-platform results; `--profile`.
- [ ] 6.2 README, onboarding guides with screenshots, did-you-mean.

## Phase 7: MCP gateway (list, docs, run-read, run-write tools, as in ask-marcel-office-cli ADR 0001)

## Phase 8: release (npm publish from CI, CHANGELOG; the user confirms every publish)

## Open risks

- The Facebook Page image host is undocumented for Instagram and Threads: phase 4.3 proves it live before anything depends on it.
- Facebook `DELETE /{post}` is documented as restricted to select developers in one place and open in another: probe live in 4.2.
- X OAuth 1.0a retirement date is unannounced: the signer stays swappable.
- Screenshots need the user's logged-in developer consoles: the guides ship with a shot list and placeholders.
