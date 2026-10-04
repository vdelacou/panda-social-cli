# Changelog

This file records the notable changes to panda-social-cli. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The `panda-social` CLI and its TypeScript library. They post a text, an image, or a long text as a thread to Threads, X, a Facebook Page and Instagram.
- `update` and `delete` for the posts on Threads, X and Facebook. On Instagram, the two commands give `unsupported`.
- `post --to` with more than one platform. The CLI posts to the platforms one after the other.
- A guided setup for each platform (`setup`), and `status` for each connected account, with the quotas of Threads and Instagram.
- `help-json` and `docs` for agents. Each error code has its next step, and a name with a small error gets a "Did you mean" hint.
- `panda-social mcp`, an MCP server with five tools, for clients that have no shell.
- An agent skill (`skills/SKILL.md`) and a setup guide for each platform.
