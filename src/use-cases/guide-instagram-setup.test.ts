import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err } from '../domain/result.ts';
import { INSTAGRAM_SETUP_STEPS } from '../presenter/instagram-setup-steps.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createInstagramFake } from '../test-helpers/instagram-fake.ts';
import { createTerminalFake } from '../test-helpers/terminal-fake.ts';
import type { TerminalEvent } from '../test-helpers/terminal-fake.ts';
import { createConnectInstagram } from './connect-instagram.ts';
import { createGuideInstagramSetup } from './guide-instagram-setup.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const TOKEN = ['instagram', 'token', 'one'].join('-');
const ENTER = 'Press Enter when this step is done.';
const TOKEN_QUESTION = 'Paste your Instagram token (it stays hidden), then press Enter.';

const guideWith = (
  answers: ReadonlyArray<string>
): {
  readonly guide: ReturnType<typeof createGuideInstagramSetup>;
  readonly terminal: ReturnType<typeof createTerminalFake>;
  readonly store: ReturnType<typeof createCredentialStoreFake>;
} => {
  const terminal = createTerminalFake(answers);
  const store = createCredentialStoreFake();
  const connectInstagram = createConnectInstagram({
    instagramFor: () => createInstagramFake({ account: { userId: instagramUserIdUnsafe('17841400000000001'), username: 'panda' } }),
    store,
    now: () => NOW,
  });
  return { guide: createGuideInstagramSetup({ terminal, steps: INSTAGRAM_SETUP_STEPS, connectInstagram }), terminal, store };
};

describe('the guided Instagram setup', () => {
  it('a first-time user sees the 6 setup steps one at a time, each waiting for Enter, then is asked for the token with hidden input, and the trimmed token is saved', async () => {
    const { guide, terminal, store } = guideWith(['', '', '', '', '', '', `  ${TOKEN}  `]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    const expected: ReadonlyArray<TerminalEvent> = [
      ...INSTAGRAM_SETUP_STEPS.flatMap((step, index): ReadonlyArray<TerminalEvent> => [
        { kind: 'step', title: step.title, position: { index: index + 1, total: 6 } },
        { kind: 'ask', question: ENTER, hidden: false },
      ]),
      { kind: 'ask', question: TOKEN_QUESTION, hidden: true },
    ];
    expect(result.ok).toBe(true);
    expect(terminal.events).toEqual(expected);
    expect(store.current().profiles['default']?.instagram?.token).toBe(TOKEN);
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
