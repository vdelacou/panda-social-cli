import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err } from '../domain/result.ts';
import type { XKeys } from '../domain/x-keys.ts';
import { X_SETUP_STEPS } from '../presenter/x-setup-steps.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createTerminalFake } from '../test-helpers/terminal-fake.ts';
import type { TerminalEvent, TerminalFake } from '../test-helpers/terminal-fake.ts';
import { createXFake } from '../test-helpers/x-fake.ts';
import { createConnectX } from './connect-x.ts';
import { createGuideXSetup } from './guide-x-setup.ts';
import type { GuideXSetup } from './guide-x-setup.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const ENTER = 'Press Enter when this step is done.';
const KEY_QUESTIONS = ['API Key', 'API Key Secret', 'Access Token', 'Access Token Secret'].map((name) => `Paste the ${name} (it stays hidden), then press Enter.`);
const ANSWERS = [['api', 'key'].join('-'), ['api', 'secret'].join('-'), ['access', 'token'].join('-'), ['access', 'secret'].join('-')];

type Guided = { readonly guide: GuideXSetup; readonly terminal: TerminalFake; readonly store: CredentialStoreFake; readonly asked: ReadonlyArray<XKeys> };

const guideWith = (answers: ReadonlyArray<string>): Guided => {
  const terminal = createTerminalFake(answers);
  const store = createCredentialStoreFake();
  const asked: XKeys[] = [];
  const connectX = createConnectX({
    xFor: (keys) => {
      asked.push(keys);
      return createXFake();
    },
    store,
    now: () => NOW,
  });
  return { guide: createGuideXSetup({ terminal, steps: X_SETUP_STEPS, connectX }), terminal, store, asked };
};

const enters = (count: number): ReadonlyArray<string> => Array.from({ length: count }, () => '');

describe('the guided X setup', () => {
  it('a first-time user sees the 5 X setup steps one at a time, each waiting for Enter, then is asked for the four keys with hidden input', async () => {
    const { guide, terminal, store } = guideWith([...enters(5), ...ANSWERS]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    const expected: ReadonlyArray<TerminalEvent> = [
      ...X_SETUP_STEPS.flatMap((step, index): ReadonlyArray<TerminalEvent> => [
        { kind: 'step', title: step.title, position: { index: index + 1, total: 5 } },
        { kind: 'ask', question: ENTER, hidden: false },
      ]),
      ...KEY_QUESTIONS.map((question): TerminalEvent => ({ kind: 'ask', question, hidden: true })),
    ];
    expect(result.ok).toBe(true);
    expect(terminal.events).toEqual(expected);
    expect(store.current().profiles['default']?.x?.accessSecret).toBe(ANSWERS[3]);
  });

  it('closing the input at any point stops the guide as cancelled, and nothing is saved', async () => {
    // Closed during step 3, then closed after the second key.
    for (const answers of [enters(2), [...enters(5), ...ANSWERS.slice(0, 2)]]) {
      const { guide, terminal, store } = guideWith(answers);

      const result = await guide({ profile: DEFAULT_PROFILE });

      expect(result).toEqual(err({ step: 'guide', cause: 'cancelled', message: 'the input closed' }));
      expect(store.current()).toEqual(EMPTY_CREDENTIALS);
      // Nothing is asked after the question the input closed on.
      expect(terminal.events.filter((event) => event.kind === 'ask')).toHaveLength(answers.length + 1);
    }
  });

  it('a key left empty is refused as invalid-keys before X is asked anything', async () => {
    const { guide, asked } = guideWith([...enters(5), ANSWERS[0] ?? '', '', ANSWERS[2] ?? '', ANSWERS[3] ?? '']);

    const result = await guide({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(err({ step: 'guide', cause: 'invalid-keys', message: 'The API Key Secret is empty.' }));
    expect(asked).toEqual([]);
  });
});
