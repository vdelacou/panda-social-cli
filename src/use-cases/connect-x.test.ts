import { describe, expect, it } from 'bun:test';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { ThreadsCredentials } from '../domain/credentials.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { XKeys } from '../domain/x-keys.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake, CredentialStoreFakeConfig } from '../test-helpers/credential-store-fake.ts';
import { createXFake } from '../test-helpers/x-fake.ts';
import type { XFakeConfig } from '../test-helpers/x-fake.ts';
import { createConnectX } from './connect-x.ts';
import type { ConnectX } from './connect-x.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const KEYS: XKeys = {
  apiKey: ['api', 'key'].join('-'),
  apiSecret: ['api', 'secret'].join('-'),
  accessToken: ['access', 'token'].join('-'),
  accessSecret: ['access', 'secret'].join('-'),
};
const THREADS: ThreadsCredentials = { token: ['threads', 'token'].join('-'), userId: '26000000000000001', username: 'panda', savedAt: '2026-09-01T08:00:00.000Z' };

const connectWith = (
  xConfig?: XFakeConfig,
  storeConfig?: CredentialStoreFakeConfig
): { readonly connect: ConnectX; readonly store: CredentialStoreFake; readonly asked: XKeys[] } => {
  const store = createCredentialStoreFake(storeConfig);
  const asked: XKeys[] = [];
  const connect = createConnectX({
    xFor: (keys) => {
      asked.push(keys);
      return createXFake(xConfig);
    },
    store,
    now: () => NOW,
  });
  return { connect, store, asked };
};

describe('connecting an X account', () => {
  it('keys that can post are checked with X and saved with the account id, username and time, next to the profile Threads token', async () => {
    const { connect, store, asked } = connectWith(
      { account: { userId: '1600000000000000001', username: 'panda', accessLevel: 'read-write' } },
      { initial: { version: 1, profiles: { default: { threads: THREADS } } } }
    );

    const result = await connect({ profile: DEFAULT_PROFILE, keys: KEYS });

    expect(result).toEqual(ok({ platform: 'x', profile: DEFAULT_PROFILE, userId: '1600000000000000001', username: 'panda' }));
    expect(asked).toEqual([KEYS]);
    expect(store.current()).toEqual({
      version: 1,
      profiles: { default: { threads: THREADS, x: { ...KEYS, userId: '1600000000000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z' } } },
    });
  });

  it('keys X refuses are not saved, and the agent gets unauthorized at the verify step', async () => {
    const { connect, store } = connectWith({ errors: { whoAmI: { kind: 'unauthorized', message: 'Unauthorized' } } });

    const result = await connect({ profile: DEFAULT_PROFILE, keys: KEYS });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'Unauthorized' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('read-only keys are refused as read-only-keys before anything is saved', async () => {
    const { connect, store } = connectWith({ account: { userId: '1600000000000000001', username: 'panda', accessLevel: 'read' } });

    const result = await connect({ profile: DEFAULT_PROFILE, keys: KEYS });

    expect(result).toEqual(err({ step: 'verify', cause: 'read-only-keys', message: 'The keys of @panda can read but not post.' }));
    expect(store.current()).toEqual(EMPTY_CREDENTIALS);
  });

  it('keys whose access level X does not report are saved: only a known read-only level is refused', async () => {
    const { connect, store } = connectWith({ account: { userId: '1600000000000000001', username: 'panda', accessLevel: null } });

    const result = await connect({ profile: DEFAULT_PROFILE, keys: KEYS });

    expect(result.ok).toBe(true);
    expect(store.current().profiles['default']?.x?.apiKey).toBe(KEYS.apiKey);
  });

  it('when the credentials file cannot be written, the agent gets a save error', async () => {
    const { connect } = connectWith(undefined, { errors: { update: { kind: 'write-failed', message: 'disk full' } } });

    const result = await connect({ profile: DEFAULT_PROFILE, keys: KEYS });

    expect(result).toEqual(err({ step: 'save', cause: 'write-failed', message: 'disk full' }));
  });
});
