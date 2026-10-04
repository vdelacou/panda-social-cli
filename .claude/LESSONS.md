# Lessons (committed)

Append-only institutional memory for this codebase. See the atelier skill's `references/lessons.md` for the format and rules.

Each entry is one of `[mistake]`, `[decision]`, or `[gotcha]`. Newest first.

---

## [gotcha] 2026-10-04 | a new command cannot land in one commit within the size gate

A new command changes ten files together: `command-spec.ts`, `commands/<name>.ts`, `command-registry.ts`, `command-builders.ts`, `cli-command.ts`, `run-cli.ts`, `manifest.test.ts`, `cli.test.ts`, `docs/COMMANDS.md` and `docs/commands.json`. With its runner and its tests, the change is above the limit of 10 files and 300 lines. A bypass with `--no-verify` does not help, because `scripts/check-commit-range.sh` checks each commit again in CI. For `mcp`, the first commit put `mcp` in the `CommandName` type and the registry only, thus no command line could reach the server. The next commit added `mcp` to `COMMAND_NAMES`, with the pinned tests, the docs and the first tests of the server.

Rule for next time: add a new command in two commits, first the code without `COMMAND_NAMES`, then `COMMAND_NAMES` with the tests.
