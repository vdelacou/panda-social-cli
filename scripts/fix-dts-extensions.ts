#!/usr/bin/env bun
/*
 * Build post-step: rewrite relative `.ts` import specifiers to `.js` inside the
 * emitted declaration files.
 *
 * tsc's `rewriteRelativeImportExtensions` rewrites JS output only; with
 * `emitDeclarationOnly` the .d.ts files keep `./x.ts`, which a consumer's
 * TypeScript cannot resolve next to `dist/*.js` (checked on TypeScript 5.9).
 */

const REWRITE = /(['"])(\.{1,2}\/[^'"]+?)\.ts\1/g;

const declarations = new Bun.Glob('**/*.d.ts').scan({ cwd: 'dist' });
let touched = 0;
let seen = 0;
for await (const relative of declarations) {
  seen += 1;
  const path = `dist/${relative}`;
  const text = await Bun.file(path).text();
  const next = text.replaceAll(REWRITE, '$1$2.js$1');
  if (next === text) {
    continue;
  }

  await Bun.write(path, next);
  touched += 1;
}
if (seen === 0) {
  console.error('fix-dts-extensions: no declaration files under dist/; run tsc -p tsconfig.build.json first');
  process.exit(1);
}
console.error(`fix-dts-extensions: rewrote .ts to .js in ${touched} of ${seen} declaration files`);
