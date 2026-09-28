# PLAN: panda-social-cli v1

Current task: phase 1, the scaffold and the Threads walking skeleton. Resume from the first unchecked box.

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

## Platform facts that shape the code (verified 2026-09-28)

- Threads: text up to 500 chars (one call with `auto_publish_text=true`); images by public URL only (JPEG/PNG, 8 MB); no edit; delete with `threads_delete`, 100 per 24h; 250 posts per 24h; token from the dashboard's User Token Generator for a Threads Tester; 60-day tokens refreshed with `th_refresh_token` (token at least 24h old).
- X: pay-per-use credits only ($0.015 a post, about $0.015 more per image, $0.20 with a URL); 280 weighted chars; `POST /2/media/upload` for images (v1.1 upload sunset 2025-06-09); edit only for Premium within 1h via `edit_options.previous_post_id`; delete 50 per 15 min; OAuth 1.0a keys never expire.
- Facebook: Page only; text via `/{page}/feed`, photo via multipart `/{page}/photos`; edit via `POST /{post}` only for posts made by the same app; delete via `DELETE /{post}` (one doc says restricted, to be probed live); posts from a Development-mode app are visible to app roles only until the app is published.
- Instagram: professional account; `image_url` only, JPEG, 8 MB, aspect 4:5 to 1.91:1; no text-only posts; no caption edit; delete only under Facebook Login with `instagram_manage_contents`; 50 or 100 posts per 24h (docs disagree, read `content_publishing_limit` at runtime).

## Phase 1: scaffold and the Threads walking skeleton

- [x] 1.0 Atelier installed at project scope and `CLAUDE.md` points at it (commits 3779db9, 069a2da).
- [x] 1.1 Toolchain: `package.json`, `tsconfig.json`, `eslint.config.js`, `bunfig.toml`, `.gitignore`, `.vscode/`, MIT `LICENSE` with a neutral holder. Done when `bun install` is clean and `check-package-json.sh` passes.
- [x] 1.2 Gates: the asset scripts in `scripts/`, `.githooks/pre-commit` and `commit-msg`, `stryker.conf.json`, `ci.yml`, `mutation.yml`, `audit.yml`. Done when every gate is seen red on a planted violation and green after the revert. (13 of 13 red with their own message; mutation 100 on format-error.)
- [x] 1.3 Memory and docs: `.claude/LESSONS.md` header, README with install steps, `git config core.hooksPath .githooks` and a `## Verify` block. Done when `check-docs.sh` passes. (Green once 1.4 added the first infra file: the generated preload is comment-only on an empty tree and unicorn's `no-empty-file` rejects it, an upstream atelier gap.)
- [x] 1.4 Walking skeleton: `panda-social post --to threads --text "..."` from argv to the Threads API and back as a JSON envelope, through use-case, port, adapter (with a deadline) and presenter. Done when the proposed tests were confirmed, seen red, then green, and lint, typecheck, coverage (100/100/80) and mutation (90) pass. (22 tests, mutation 100 on 34 mutants; a live call with an invalid token got OAuth code 190 "Cannot parse access token", so Threads reads the `Authorization: Bearer` header.)
- [x] 1.5 Packaging: `bun build --target=node` to `dist/cli.js` and `dist/index.js`, `.d.ts` emit, shebang. Done when the built CLI answers under Bun and under Node, and `bun pm pack --dry-run` lists only `dist/`, README, LICENSE and package.json. (`smoke:dist` passes under both and fails on a missing shebang or library bundle; the packed tarball typechecks in a `nodenext` consumer with `skipLibCheck: false`; `--version` moved to 2.2 with the registry.)
- [ ] 1.6 Landing: commit slices of at most 10 files and 300 lines, each approved by the user before commit and before push.

## Phase 2: Threads, complete

- [ ] 2.1 `setup threads`: step-by-step wizard (TTY) and `--print-steps` markdown (agents), paste the token, verify with `GET /me`, store per profile. Done when an invalid token is refused with a hint and a valid one is stored 0600.
- [ ] 2.2 Command registry, `help-json`, `docs <command>`, generated `docs/COMMANDS.md` and `commands.json`, the error-hint table.
- [ ] 2.3 `post` with an image URL, `delete`, `update --repost`, `--split` reply chains with rollback, publishing-limit readout.
- [ ] 2.4 Token refresh (`th_refresh_token`), `status` command (who am I, token age, quota).
- [ ] 2.5 `docs/setup/threads.md` with the screenshot shot list, `skills/SKILL.md`.
- [ ] 2.6 Live QA script the user runs with a real token: post, read back, delete.

## Phase 3: X

- [ ] 3.1 `setup x` (four keys, verify with `GET /2/users/me`, check `x-access-level: read-write`), credits warning.
- [ ] 3.2 `post` text and image (`/2/media/upload`), weighted 280-char count, `delete`, `update` native for Premium, `--repost`, 402 and 403 hints.

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
