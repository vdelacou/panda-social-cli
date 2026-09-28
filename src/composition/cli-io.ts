import type { Readable, Writable } from 'node:stream';

// Everything the process owns arrives here, so a whole run is testable in-process.
// `readStdin` and `terminal` are optional: without them a run stays headless, with no
// piped input and no prompts, which is how an agent runs the CLI.
export type CliIo = {
  readonly argv: ReadonlyArray<string>;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly writeOut: (line: string) => void;
  readonly logStream: Writable;
  readonly readStdin?: () => Promise<string>;
  readonly terminal?: { readonly input: Readable; readonly output: Writable };
};
