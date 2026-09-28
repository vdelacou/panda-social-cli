import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err } from '../domain/result.ts';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import { THREADS_SETUP_STEPS } from '../presenter/threads-setup-steps.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createTerminalFake } from '../test-helpers/terminal-fake.ts';
import type { TerminalEvent } from '../test-helpers/terminal-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createConnectThreads } from './connect-threads.ts';
import { createGuideThreadsSetup } from './guide-threads-setup.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const TOKEN = ['threads', 'token', 'one'].join('-');
const ENTER = 'Press Enter when this step is done.';
const TOKEN_QUESTION = 'Paste your Threads token (it stays hidden), then press Enter.';

const guideWith = (
  answers: ReadonlyArray<string>
): {
  readonly guide: ReturnType<typeof createGuideThreadsSetup>;
  readonly terminal: ReturnType<typeof createTerminalFake>;
  readonly store: ReturnType<typeof createCredentialStoreFake>;
} => {
  const terminal = createTerminalFake(answers);
  const store = createCredentialStoreFake();
  const connectThreads = createConnectThreads({
    threadsFor: () => createThreadsFake({ account: { userId: threadsUserIdUnsafe('26000000000000001'), username: 'panda' } }),
    store,
    now: () => NOW,
  });
  return { guide: createGuideThreadsSetup({ terminal, steps: THREADS_SETUP_STEPS, connectThreads }), terminal, store };
};

describe('the guided Threads setup', () => {
  it('a first-time user sees the 6 setup steps one at a time, each waiting for Enter, then is asked for the token with hidden input', async () => {
    const { guide, terminal, store } = guideWith(['', '', '', '', '', '', `  ${TOKEN}  `]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    const expected: ReadonlyArray<TerminalEvent> = [
      ...THREADS_SETUP_STEPS.flatMap((step, index): ReadonlyArray<TerminalEvent> => [
        { kind: 'step', title: step.title, position: { index: index + 1, total: 6 } },
        { kind: 'ask', question: ENTER, hidden: false },
      ]),
      { kind: 'ask', question: TOKEN_QUESTION, hidden: true },
    ];
    expect(result.ok).toBe(true);
    expect(terminal.events).toEqual(expected);
    expect(store.current().profiles['default']?.threads?.token).toBe(TOKEN);
  });

  it('when the user closes the input before pasting a token, the guide stops as cancelled and saves nothing', async () => {
    // Closed during step 3, then closed at the token prompt itself.
    for (const enters of [2, 6]) {
      const { guide, terminal, store } = guideWith(Array.from({ length: enters }, () => ''));

      const result = await guide({ profile: DEFAULT_PROFILE });

      expect(result).toEqual(err({ step: 'guide', cause: 'cancelled', message: 'the input closed' }));
      expect(store.current()).toEqual(EMPTY_CREDENTIALS);
      expect(terminal.events.filter((event) => event.kind === 'step')).toHaveLength(Math.min(enters + 1, 6));
    }
  });
});
