import { runCli } from './composition/run-cli.ts';
import { formatError } from './domain/utilities/format-error.ts';

// The one top-level catch (rule 17): a throw that reaches here is a bug, not an expected failure.
try {
  process.exitCode = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    writeOut: (line) => {
      process.stdout.write(`${line}\n`);
    },
    logStream: process.stderr,
  });
} catch (error) {
  process.stderr.write(`[crash] ${formatError(error)}\n`);
  process.exitCode = 1;
}
