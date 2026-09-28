import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { ThreadsCredentials, XCredentials } from '../domain/credentials.ts';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import type { GrantedPage } from '../domain/facebook-page.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake, CredentialStoreFakeConfig } from '../test-helpers/credential-store-fake.ts';
import { createFacebookFake, FACEBOOK_FAKE_PAGE } from '../test-helpers/facebook-fake.ts';
import type { FacebookFakeConfig } from '../test-helpers/facebook-fake.ts';
import { createConnectFacebook } from './connect-facebook.ts';
import type { ConnectFacebook } from './connect-facebook.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const USER_TOKEN = ['user', 'token'].join('-');
const BOOKS: GrantedPage = { id: facebookPageIdUnsafe('104000000000002'), name: 'Panda Books', token: ['books', 'page', 'token'].join('-'), tasks: ['CREATE_CONTENT', 'MODERATE'] };
const THREADS: ThreadsCredentials = { token: ['threads', 'token'].join('-'), userId: '26000000000000001', username: 'panda', savedAt: '2026-09-01T08:00:00.000Z' };
const X: XCredentials = {
  apiKey: ['api', 'key'].join('-'),
  apiSecret: ['api', 'secret'].join('-'),
  accessToken: ['access', 'token'].join('-'),
  accessSecret: ['access', 'secret'].join('-'),
  userId: '1600000000000000001',
  username: 'panda',
  savedAt: '2026-09-02T08:00:00.000Z',
};

const connectWith = (
  facebookConfig?: FacebookFakeConfig,
  storeConfig?: CredentialStoreFakeConfig
): { readonly connect: ConnectFacebook; readonly store: CredentialStoreFake; readonly asked: ReadonlyArray<string> } => {
  const store = createCredentialStoreFake(storeConfig);
  const asked: string[] = [];
  const connect = createConnectFacebook({
    facebookFor: (token) => {
      asked.push(token);
      return createFacebookFake(facebookConfig);
    },
    store,
    now: () => NOW,
  });
  return { connect, store, asked };
};

describe('connecting a Facebook Page', () => {
  it("a token that grants one Page saves that Page's id, name and token with the time, next to the profile's Threads token and X keys, and never the user token", async () => {
    const { connect, store, asked } = connectWith(undefined, { initial: { version: 1, profiles: { default: { threads: THREADS, x: X } } } });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(result).toEqual(ok({ platform: 'facebook', profile: DEFAULT_PROFILE, pageId: FACEBOOK_FAKE_PAGE.id, pageName: 'Panda Bakery' }));
    expect(asked).toEqual([USER_TOKEN]);
    expect(store.current()).toEqual({
      version: 1,
      profiles: {
        default: {
          threads: THREADS,
          x: X,
          facebook: { pageId: '104000000000001', pageName: 'Panda Bakery', token: FACEBOOK_FAKE_PAGE.token, savedAt: '2026-09-28T09:30:00.000Z' },
        },
      },
    });
    expect(JSON.stringify(store.current())).not.toContain(USER_TOKEN);
  });

  it('a token that grants several Pages saves the one named with --page', async () => {
    const { connect, store } = connectWith({ pages: [FACEBOOK_FAKE_PAGE, BOOKS] });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN, pageId: BOOKS.id });

    expect(result).toEqual(ok({ platform: 'facebook', profile: DEFAULT_PROFILE, pageId: BOOKS.id, pageName: 'Panda Books' }));
    expect(store.current().profiles['default']?.facebook?.token).toBe(BOOKS.token);
  });

  it("a token that grants several Pages and no --page is refused as choose-page, listing each Page's id and name, and nothing is saved", async () => {
    const { connect, store } = connectWith({ pages: [FACEBOOK_FAKE_PAGE, BOOKS] });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(result).toEqual(
      err({ step: 'choose', cause: 'choose-page', message: 'The token grants several Pages: 104000000000001 (Panda Bakery), 104000000000002 (Panda Books).' })
    );
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('a --page the token does not grant is refused as choose-page, listing the Pages it does grant', async () => {
    const { connect, store } = connectWith();

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN, pageId: facebookPageIdUnsafe('104000000000009') });

    expect(result).toEqual(
      err({ step: 'choose', cause: 'choose-page', message: 'The token does not grant the Page 104000000000009. The Pages it grants: 104000000000001 (Panda Bakery).' })
    );
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('a token that grants no Page is refused as no-pages', async () => {
    const { connect, store } = connectWith({ pages: [] });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(result).toEqual(err({ step: 'choose', cause: 'no-pages', message: 'The token grants no Facebook Page.' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('a Page on which the user lacks the CREATE_CONTENT task is refused as missing-page-task; a Page whose tasks Meta does not list is saved', async () => {
    const moderator = connectWith({ pages: [{ ...FACEBOOK_FAKE_PAGE, tasks: ['ANALYZE', 'MODERATE'] }] });
    const unlisted = connectWith({ pages: [{ ...FACEBOOK_FAKE_PAGE, tasks: null }] });

    const refused = await moderator.connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });
    const saved = await unlisted.connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(refused).toEqual(
      err({ step: 'choose', cause: 'missing-page-task', message: 'Your role on Panda Bakery (104000000000001) lacks the CREATE_CONTENT task, which posting needs.' })
    );
    expect(moderator.store.current()).toEqual(EMPTY_CREDENTIALS);
    expect(saved.ok).toBe(true);
    expect(unlisted.store.current().profiles['default']?.facebook?.token).toBe(FACEBOOK_FAKE_PAGE.token);
  });

  it('a token Meta refuses is not saved, and the agent gets unauthorized at the verify step', async () => {
    const { connect, store } = connectWith({ errors: { listPages: { kind: 'unauthorized', message: 'Error validating access token: Session has expired.' } } });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'Error validating access token: Session has expired.' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('when the credentials file cannot be written, the agent gets a save error', async () => {
    const { connect } = connectWith(undefined, { errors: { update: { kind: 'write-failed', message: 'disk full' } } });

    const result = await connect({ profile: DEFAULT_PROFILE, userToken: USER_TOKEN });

    expect(result).toEqual(err({ step: 'save', cause: 'write-failed', message: 'disk full' }));
  });
});
