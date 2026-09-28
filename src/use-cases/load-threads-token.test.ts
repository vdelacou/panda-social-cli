import { describe, expect, it } from 'bun:test';
import type { ThreadsCredentials } from '../domain/credentials.ts';
import { DEFAULT_PROFILE, profileNameUnsafe } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake, CredentialStoreFakeConfig } from '../test-helpers/credential-store-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import type { LoggerFake } from '../test-helpers/logger-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import type { ThreadsFake, ThreadsFakeConfig } from '../test-helpers/threads-fake.ts';
import { createLoadThreadsToken } from './load-threads-token.ts';
import type { LoadThreadsToken } from './load-threads-token.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const OLD = ['old', 'threads', 'token'].join('-');
const NEW = ['new', 'threads', 'token'].join('-');

const saved = (savedAt: string): ThreadsCredentials => ({ token: OLD, userId: '26000000000000001', username: 'panda', savedAt });

type Loader = {
  readonly load: LoadThreadsToken;
  readonly store: CredentialStoreFake;
  readonly threads: ThreadsFake;
  readonly logger: LoggerFake;
  readonly askedWith: ReadonlyArray<string>;
};

// The default profile holds `credentials`; Threads answers a refresh with NEW for 60 days.
const loaderFor = (credentials: ThreadsCredentials, threadsConfig?: ThreadsFakeConfig, storeErrors?: CredentialStoreFakeConfig['errors']): Loader => {
  const store = createCredentialStoreFake({ initial: { version: 1, profiles: { default: { threads: credentials } } }, errors: storeErrors });
  const threads = createThreadsFake({ refreshed: { token: NEW, expiresInSeconds: 5_184_000 }, ...threadsConfig });
  const logger = createLoggerFake();
  const askedWith: string[] = [];
  const load = createLoadThreadsToken({
    store,
    threadsFor: (token) => {
      askedWith.push(token);
      return threads;
    },
    now: () => NOW,
    logger,
  });
  return { load, store, threads, logger, askedWith };
};

describe('loading the saved Threads token', () => {
  it('a token saved 29 days and 23 hours ago is used as saved, and Threads is never asked to refresh it', async () => {
    const { load, askedWith } = loaderFor(saved('2026-08-29T10:30:00.000Z'));

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: saved('2026-08-29T10:30:00.000Z'), refreshed: false }));
    expect(askedWith).toEqual([]);
  });

  it('a token saved exactly 30 days ago is refreshed first: the new token, the time and the expiry Threads gave are saved, and the command gets the new token', async () => {
    const { load, store, threads, logger, askedWith } = loaderFor(saved('2026-08-29T09:30:00.000Z'));
    const refreshed = { token: NEW, userId: '26000000000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z', expiresAt: '2026-11-27T09:30:00.000Z' };

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: refreshed, refreshed: true }));
    expect(store.current()).toEqual({ version: 1, profiles: { default: { threads: refreshed } } });
    expect(askedWith).toEqual([OLD]);
    expect(threads.events).toEqual(['refresh']);
    expect(logger.calls).toEqual([{ level: 'info', event: 'threads.token.refreshed' }]);
  });

  it('when Threads refuses the refresh, the saved token is used as it is and a warning names the cause', async () => {
    const { load, store, logger } = loaderFor(saved('2026-08-01T09:30:00.000Z'), { errors: { refreshToken: { kind: 'unauthorized', message: 'token expired' } } });

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: saved('2026-08-01T09:30:00.000Z'), refreshed: false }));
    expect(store.current().profiles).toEqual({ default: { threads: saved('2026-08-01T09:30:00.000Z') } });
    expect(logger.calls).toEqual([{ level: 'warn', event: 'threads.token.refresh-failed', meta: { cause: 'unauthorized' } }]);
  });

  it('when the refreshed token cannot be saved, this run still uses it and a warning names the cause', async () => {
    const { load, logger } = loaderFor(saved('2026-08-01T09:30:00.000Z'), undefined, { update: { kind: 'write-failed', message: 'disk full' } });
    const refreshed = { token: NEW, userId: '26000000000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z', expiresAt: '2026-11-27T09:30:00.000Z' };

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: refreshed, refreshed: true }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'threads.token.save-failed', meta: { cause: 'write-failed' } }]);
  });

  it('a profile with no saved Threads token fails with missing-credentials, naming the profile', async () => {
    const { load } = loaderFor(saved('2026-09-01T09:30:00.000Z'));

    const result = await load({ profile: profileNameUnsafe('brand-a') });

    expect(result).toEqual(err({ step: 'load', cause: 'missing-credentials', message: 'No Threads token is configured for the "brand-a" profile.' }));
  });

  it('an unreadable credentials file fails with unreadable, before Threads is asked anything', async () => {
    const { load, askedWith } = loaderFor(saved('2026-08-01T09:30:00.000Z'), undefined, { load: { kind: 'unreadable', message: 'permission denied' } });

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(err({ step: 'load', cause: 'unreadable', message: 'permission denied' }));
    expect(askedWith).toEqual([]);
  });
});
