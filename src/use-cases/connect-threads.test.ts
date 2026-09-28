import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import { DEFAULT_PROFILE, profileNameUnsafe } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createConnectThreads } from './connect-threads.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const TOKEN = ['threads', 'token', 'one'].join('-');
const ACCOUNT = { userId: threadsUserIdUnsafe('26000000000000001'), username: 'panda' };

describe('connecting a Threads account', () => {
  it('when a valid Threads token is connected to the default profile, it is saved with the account username and the agent gets the username back', async () => {
    const store = createCredentialStoreFake();
    const tokensChecked: string[] = [];
    const connect = createConnectThreads({
      threadsFor: (token) => {
        tokensChecked.push(token);
        return createThreadsFake({ account: ACCOUNT });
      },
      store,
      now: () => NOW,
    });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(ok({ platform: 'threads', profile: DEFAULT_PROFILE, userId: ACCOUNT.userId, username: 'panda' }));
    expect(tokensChecked).toEqual([TOKEN]);
    expect(store.current()).toEqual({
      version: 1,
      profiles: { default: { threads: { token: TOKEN, userId: ACCOUNT.userId, username: 'panda', savedAt: '2026-09-28T09:30:00.000Z' } } },
    });
  });

  it('when Threads refuses the token, nothing is saved and the agent gets an unauthorized error naming the verify step', async () => {
    const store = createCredentialStoreFake();
    const threads = createThreadsFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'token refused' } } });
    const connect = createConnectThreads({ threadsFor: () => threads, store, now: () => NOW });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'token refused' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('when the credentials file cannot be written, the agent gets a save error and the token is not reported as connected', async () => {
    const store = createCredentialStoreFake({ errors: { update: { kind: 'write-failed', message: 'disk full' } } });
    const connect = createConnectThreads({ threadsFor: () => createThreadsFake({ account: ACCOUNT }), store, now: () => NOW });

    const result = await connect({ profile: DEFAULT_PROFILE, token: TOKEN });

    expect(result).toEqual(err({ step: 'save', cause: 'write-failed', message: 'disk full' }));
  });

  it('connecting a second profile keeps the first profile credentials', async () => {
    const first = { token: TOKEN, userId: ACCOUNT.userId, username: 'panda', savedAt: '2026-09-01T08:00:00.000Z' };
    const store = createCredentialStoreFake({ initial: { version: 1, profiles: { default: { threads: first } } } });
    const second = { userId: threadsUserIdUnsafe('26000000000000002'), username: 'panda_brand' };
    const connect = createConnectThreads({ threadsFor: () => createThreadsFake({ account: second }), store, now: () => NOW });

    const result = await connect({ profile: profileNameUnsafe('brand-a'), token: 'second-token' });

    expect(result.ok).toBe(true);
    expect(store.current().profiles).toEqual({
      default: { threads: first },
      'brand-a': { threads: { token: 'second-token', ...second, savedAt: '2026-09-28T09:30:00.000Z' } },
    });
  });
});
