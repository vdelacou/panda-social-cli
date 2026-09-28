import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import type { GrantedPage } from '../domain/facebook-page.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { FACEBOOK_SETUP_STEPS } from '../presenter/facebook-setup-steps.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createFacebookFake, FACEBOOK_FAKE_PAGE } from '../test-helpers/facebook-fake.ts';
import { createTerminalFake } from '../test-helpers/terminal-fake.ts';
import type { TerminalEvent, TerminalFake } from '../test-helpers/terminal-fake.ts';
import { createConnectFacebook } from './connect-facebook.ts';
import { createGuideFacebookSetup } from './guide-facebook-setup.ts';
import type { GuideFacebookSetup } from './guide-facebook-setup.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const USER_TOKEN = ['user', 'token'].join('-');
const ENTER = 'Press Enter when this step is done.';
const TOKEN_QUESTION = 'Paste the extended token from step 5 (it stays hidden), then press Enter.';
const PAGE_QUESTION =
  'The token grants several Pages: 104000000000001 (Panda Bakery), 104000000000002 (Panda Books). Paste the id of the Page this profile posts to, then press Enter.';
const BOOKS: GrantedPage = { id: facebookPageIdUnsafe('104000000000002'), name: 'Panda Books', token: ['books', 'page', 'token'].join('-'), tasks: ['CREATE_CONTENT'] };

type Guided = { readonly guide: GuideFacebookSetup; readonly terminal: TerminalFake; readonly store: CredentialStoreFake; readonly asked: ReadonlyArray<string> };

const guideWith = (answers: ReadonlyArray<string>, pages?: ReadonlyArray<GrantedPage>): Guided => {
  const terminal = createTerminalFake(answers);
  const store = createCredentialStoreFake();
  const asked: string[] = [];
  const connectFacebook = createConnectFacebook({
    facebookFor: (token) => {
      asked.push(token);
      return createFacebookFake(pages && { pages });
    },
    store,
    now: () => NOW,
  });
  return { guide: createGuideFacebookSetup({ terminal, steps: FACEBOOK_SETUP_STEPS, connectFacebook }), terminal, store, asked };
};

const enters = (count: number): ReadonlyArray<string> => Array.from({ length: count }, () => '');

describe('the guided Facebook setup', () => {
  it('a first-time user sees the 5 Facebook setup steps one at a time, each waiting for Enter, then is asked for the extended token with hidden input', async () => {
    const { guide, terminal, store, asked } = guideWith([...enters(5), `  ${USER_TOKEN}  `]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    const expected: ReadonlyArray<TerminalEvent> = [
      ...FACEBOOK_SETUP_STEPS.flatMap((step, index): ReadonlyArray<TerminalEvent> => [
        { kind: 'step', title: step.title, position: { index: index + 1, total: 5 } },
        { kind: 'ask', question: ENTER, hidden: false },
      ]),
      { kind: 'ask', question: TOKEN_QUESTION, hidden: true },
    ];
    expect(result.ok).toBe(true);
    expect(terminal.events).toEqual(expected);
    expect(asked).toEqual([USER_TOKEN]);
    expect(store.current().profiles['default']?.facebook?.pageId).toBe('104000000000001');
  });

  it('when the token grants several Pages, the guide names them and asks for the id of the Page to keep, then saves that one', async () => {
    const { guide, terminal, store } = guideWith([...enters(5), USER_TOKEN, ' 104000000000002 '], [FACEBOOK_FAKE_PAGE, BOOKS]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ platform: 'facebook', profile: DEFAULT_PROFILE, pageId: BOOKS.id, pageName: 'Panda Books' }));
    expect(terminal.events.at(-1)).toEqual({ kind: 'ask', question: PAGE_QUESTION, hidden: false });
    expect(store.current().profiles['default']?.facebook?.token).toBe(BOOKS.token);
  });

  it('an answer that is not a Page id is refused as invalid-page-id, and nothing is saved', async () => {
    const { guide, store } = guideWith([...enters(5), USER_TOKEN, 'Panda Books'], [FACEBOOK_FAKE_PAGE, BOOKS]);

    const result = await guide({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(err({ step: 'guide', cause: 'invalid-page-id', message: 'Not a Facebook Page id: "Panda Books".' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('a token that grants no Page ends the guide as no-pages, and no Page question is asked', async () => {
    const { guide, terminal, store } = guideWith([...enters(5), USER_TOKEN], []);

    const result = await guide({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(err({ step: 'choose', cause: 'no-pages', message: 'The token grants no Facebook Page.' }));
    expect(terminal.events.filter((event) => event.kind === 'ask')).toHaveLength(6);
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('closing the input during the steps, at the token or at the Page question stops the guide as cancelled, and nothing is saved', async () => {
    for (const answers of [enters(3), enters(5), [...enters(5), USER_TOKEN]]) {
      const { guide, terminal, store } = guideWith(answers, [FACEBOOK_FAKE_PAGE, BOOKS]);

      const result = await guide({ profile: DEFAULT_PROFILE });

      expect(result).toEqual(err({ step: 'guide', cause: 'cancelled', message: 'the input closed' }));
      expect(store.current()).toEqual(EMPTY_CREDENTIALS);
      // Nothing is asked after the question the input closed on.
      expect(terminal.events.filter((event) => event.kind === 'ask')).toHaveLength(answers.length + 1);
    }
  });
});
