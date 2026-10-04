import { runCli } from './composition/run-cli.ts';
import { formatError } from './domain/utilities/format-error.ts';

const readStdin = async (): Promise<string> => {
  let text = '';
  for await (const chunk of process.stdin) text += String(chunk);
  return text;
};

// A human at a terminal gets the guided setup on stderr; anything else (an agent, a
// pipe, CI) stays headless and reads JSON from stdout.
const interactive = process.stdin.isTTY && process.stderr.isTTY;

// The one top-level catch (rule 17): a throw that reaches here is a bug, not an expected failure.
try {
  process.exitCode = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    writeOut: (line) => {
      process.stdout.write(`${line}\n`);
    },
    logStream: process.stderr,
    readStdin,
    stdio: { input: process.stdin, output: process.stdout },
    ...(interactive && { terminal: { input: process.stdin, output: process.stderr } }),
  });
} catch (error) {
  process.stderr.write(`[crash] ${formatError(error)}\n`);
  process.exitCode = 1;
}
