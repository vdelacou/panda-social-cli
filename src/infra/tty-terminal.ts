import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import type { Readable } from 'node:stream';
import { err, ok } from '../domain/result.ts';
import type { SetupStep, StepPosition } from '../domain/setup-step.ts';
import type { Terminal } from '../use-cases/ports/terminal.ts';

export type TtyTerminalConfig = {
  readonly input: Readable;
  readonly output: Writable;
  // true on a real terminal: line editing on, and typed characters echo unless muted
  readonly terminal: boolean;
  readonly renderStep: (step: SetupStep, position: StepPosition) => string;
};

// `close` releases the input so the process can exit once the guide is done.
export type TtyTerminal = Terminal & {
  readonly close: () => void;
};

export const createTtyTerminal = (config: TtyTerminalConfig): TtyTerminal => {
  // Echo passes through this stream; a hidden question mutes it before the user types,
  // which is the only moment muting can keep a secret off the screen.
  let muted = false;
  const echo = new Writable({
    write: (chunk: Buffer, encoding, done) => {
      if (muted) {
        done();
        return;
      }
      config.output.write(chunk, encoding, done);
    },
  });
  const reader = createInterface({ input: config.input, output: echo, terminal: config.terminal });
  // The async iterator buffers lines, so an answer typed ahead of its question is kept.
  const lines = reader[Symbol.asyncIterator]();
  return {
    showStep: (step, position) => {
      config.output.write(config.renderStep(step, position));
    },
    ask: async (question, options) => {
      config.output.write(`${question} `);
      muted = options.hidden;
      const next = await lines.next();
      muted = false;
      if (options.hidden) config.output.write('\n');
      if (next.done === true) return err({ kind: 'cancelled', message: 'The input closed before an answer was given.' });
      return ok(next.value);
    },
    close: () => {
      reader.close();
    },
  };
};
