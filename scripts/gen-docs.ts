#!/usr/bin/env bun
/*
 * Writes docs/COMMANDS.md and docs/commands.json from the command registry
 * (src/presenter/command-registry.ts), the one description of the command surface.
 *
 *   bun run docs:gen     # rewrite both files after changing a command
 *   bun run docs:check   # CI: exit 1 when either file no longer matches the registry
 */
import { renderCommandsReference } from '../src/presenter/command-docs.ts';
import { buildManifest } from '../src/presenter/manifest.ts';

const outputs = [
  { path: 'docs/COMMANDS.md', content: renderCommandsReference() },
  { path: 'docs/commands.json', content: `${JSON.stringify(buildManifest(), undefined, 2)}\n` },
];

const check = process.argv.includes('--check');
let stale = 0;
for (const output of outputs) {
  const file = Bun.file(output.path);
  const current = (await file.exists()) ? await file.text() : '';
  if (current === output.content) continue;
  if (check) {
    console.error(`docs-check: ${output.path} no longer matches the command registry; run bun run docs:gen`);
    stale += 1;
    continue;
  }
  await Bun.write(output.path, output.content);
  console.log(`docs-gen: wrote ${output.path}`);
}
if (stale > 0) process.exit(1);
if (check) console.log('docs-check: docs/COMMANDS.md and docs/commands.json match the command registry');
