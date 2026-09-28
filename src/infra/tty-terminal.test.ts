import { describe, expect, it } from 'bun:test';
import { PassThrough, Writable } from 'node:stream';
import type { SetupStep, StepPosition } from '../domain/setup-step.ts';
import { createTtyTerminal } from './tty-terminal.ts';
import type { TtyTerminal } from './tty-terminal.ts';

const STEP: SetupStep = {
  title: 'Create your Meta developer account',
  actions: ['Log in to Facebook in your browser.'],
  url: 'https://developers.facebook.com/async/registration',
};

const renderStep = (step: SetupStep, position: StepPosition): string => `Step ${position.index} of ${position.total}: ${step.title}\n`;

// A real terminal session: line editing on, so typed characters echo unless muted.
const session = (): { readonly input: PassThrough; readonly terminal: TtyTerminal; readonly shown: () => string } => {
  const input = new PassThrough();
  const chunks: string[] = [];
  const output = new Writable({
    write: (chunk: Buffer, _encoding, done) => {
      chunks.push(chunk.toString());
      done();
    },
  });
  return { input, terminal: createTtyTerminal({ input, output, terminal: true, renderStep }), shown: () => chunks.join('') };
};

describe('the terminal', () => {
  it('a step renders and Enter continues', async () => {
    const { input, terminal, shown } = session();

    terminal.showStep(STEP, { index: 1, total: 6 });
    const answer = terminal.ask('Press Enter when this step is done.', { hidden: false });
    input.write('\n');

    expect(await answer).toEqual({ ok: true, value: '' });
    expect(shown()).toContain('Step 1 of 6: Create your Meta developer account');
    expect(shown()).toContain('Press Enter when this step is done.');
    terminal.close();
  });

  it('hidden input is read without being echoed', async () => {
    const { input, terminal, shown } = session();

    const answer = terminal.ask('Paste your Threads token (it stays hidden), then press Enter.', { hidden: true });
    input.write('secret-token\n');

    expect(await answer).toEqual({ ok: true, value: 'secret-token' });
    expect(shown()).toContain('Paste your Threads token');
    expect(shown()).not.toContain('secret-token');
    terminal.close();
  });

  it('input that ends early comes back as cancelled', async () => {
    const { input, terminal } = session();

    const answer = terminal.ask('Press Enter when this step is done.', { hidden: false });
    input.end();

    expect(await answer).toEqual({ ok: false, error: { kind: 'cancelled', message: expect.any(String) } });
    terminal.close();
  });
});
