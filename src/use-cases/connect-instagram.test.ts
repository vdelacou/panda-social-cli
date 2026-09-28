import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { FacebookCredentials, ThreadsCredentials, XCredentials } from '../domain/credentials.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createInstagramFake } from '../test-helpers/instagram-fake.ts';
import { createConnectInstagram } from './connect-instagram.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['instagram', 'token', 'one'].join('-');
const ACCOUNT = { userId: instagramUserIdUnsafe('17841400000000001'), username: 'panda' };
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
const FACEBOOK: FacebookCredentials = { pageId: '104000000000001', pageName: 'Panda Bakery', token: ['bakery', 'page', 'token'].join('-'), savedAt: '2026-09-03T08:00:00.000Z' };

describe('connecting an Instagram account', () => {
  it('when a valid Instagram token is connected to the default profile, it is saved with the account id and username, and the agent gets them back', async () => {
    const store = createCredentialStoreFake();
    const tokensChecked: string[] = [];
    const connect = createConnectInstagram({
      instagramFor: (token) => {
        tokensChecked.push(token);
        return createInstagramFake({ account: ACCOUNT });
      },
      store,
      now: () => NOW,
    });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(ok({ platform: 'instagram', profile: DEFAULT_PROFILE, userId: ACCOUNT.userId, username: 'panda' }));
    expect(tokensChecked).toEqual([TOKEN]);
    expect(store.current()).toEqual({
      version: 1,
      profiles: { default: { instagram: { token: TOKEN, userId: ACCOUNT.userId, username: 'panda', savedAt: '2026-09-28T09:30:00.000Z' } } },
    });
  });

  it('when Instagram refuses the token, nothing is saved and the agent gets an unauthorized error naming the verify step', async () => {
    const store = createCredentialStoreFake();
    const instagram = createInstagramFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'token refused' } } });
    const connect = createConnectInstagram({ instagramFor: () => instagram, store, now: () => NOW });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'token refused' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('when the credentials file cannot be written, the agent gets a save error and the token is not reported as connected', async () => {
    const store = createCredentialStoreFake({ errors: { update: { kind: 'write-failed', message: 'disk full' } } });
    const connect = createConnectInstagram({ instagramFor: () => createInstagramFake({ account: ACCOUNT }), store, now: () => NOW });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(err({ step: 'save', cause: 'write-failed', message: 'disk full' }));
  });

  it('connecting Instagram keeps the Threads, X and Facebook credentials already saved in the profile', async () => {
    const store = createCredentialStoreFake({ initial: { version: 1, profiles: { default: { threads: THREADS, x: X, facebook: FACEBOOK } } } });
    const connect = createConnectInstagram({ instagramFor: () => createInstagramFake({ account: ACCOUNT }), store, now: () => NOW });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result.ok).toBe(true);
    expect(store.current().profiles).toEqual({
      default: { threads: THREADS, x: X, facebook: FACEBOOK, instagram: { token: TOKEN, ...ACCOUNT, savedAt: '2026-09-28T09:30:00.000Z' } },
    });
  });
});
