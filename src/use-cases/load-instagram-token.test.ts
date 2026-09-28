import { describe, expect, it } from 'bun:test';
import type { InstagramCredentials } from '../domain/credentials.ts';
import { DEFAULT_PROFILE, profileNameUnsafe } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createCredentialStoreFake } from '../test-helpers/credential-store-fake.ts';
import type { CredentialStoreFake, CredentialStoreFakeConfig } from '../test-helpers/credential-store-fake.ts';
import { createInstagramFake } from '../test-helpers/instagram-fake.ts';
import type { InstagramFake, InstagramFakeConfig } from '../test-helpers/instagram-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import type { LoggerFake } from '../test-helpers/logger-fake.ts';
import { createLoadInstagramToken } from './load-instagram-token.ts';
import type { LoadInstagramToken } from './load-instagram-token.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const OLD = ['old', 'instagram', 'token'].join('-');
const NEW = ['new', 'instagram', 'token'].join('-');

const saved = (savedAt: string): InstagramCredentials => ({ token: OLD, userId: '17841400000000001', username: 'panda', savedAt });

type Loader = {
  readonly load: LoadInstagramToken;
  readonly store: CredentialStoreFake;
  readonly instagram: InstagramFake;
  readonly logger: LoggerFake;
  readonly askedWith: ReadonlyArray<string>;
};

// The default profile holds `credentials`; Instagram answers a refresh with NEW for 60 days.
const loaderFor = (credentials: InstagramCredentials, instagramConfig?: InstagramFakeConfig, storeErrors?: CredentialStoreFakeConfig['errors']): Loader => {
  const store = createCredentialStoreFake({ initial: { version: 1, profiles: { default: { instagram: credentials } } }, errors: storeErrors });
  const instagram = createInstagramFake({ refreshed: { token: NEW, expiresInSeconds: 5_184_000 }, ...instagramConfig });
  const logger = createLoggerFake();
  const askedWith: string[] = [];
  const load = createLoadInstagramToken({
    store,
    instagramFor: (token) => {
      askedWith.push(token);
      return instagram;
    },
    now: () => NOW,
    logger,
  });
  return { load, store, instagram, logger, askedWith };
};

describe('loading the saved Instagram token', () => {
  it('a token saved 29 days and 23 hours ago is used as saved, and Instagram is never asked to refresh it', async () => {
    const { load, askedWith } = loaderFor(saved('2026-08-29T10:30:00.000Z'));

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: saved('2026-08-29T10:30:00.000Z'), refreshed: false }));
    expect(askedWith).toEqual([]);
  });

  it('a token saved exactly 30 days ago is refreshed first: the new token, the time and the expiry Instagram gave are saved, and the command gets the new token', async () => {
    const { load, store, instagram, logger, askedWith } = loaderFor(saved('2026-08-29T09:30:00.000Z'));
    const refreshed = { token: NEW, userId: '17841400000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z', expiresAt: '2026-11-27T09:30:00.000Z' };

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: refreshed, refreshed: true }));
    expect(store.current()).toEqual({ version: 1, profiles: { default: { instagram: refreshed } } });
    expect(askedWith).toEqual([OLD]);
    expect(instagram.events).toEqual(['refresh']);
    expect(logger.calls).toEqual([{ level: 'info', event: 'instagram.token.refreshed' }]);
  });

  it('when Instagram refuses the refresh, the saved token is used as it is and a warning names the cause', async () => {
    const { load, store, logger } = loaderFor(saved('2026-08-01T09:30:00.000Z'), { errors: { refreshToken: { kind: 'unauthorized', message: 'token expired' } } });

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: saved('2026-08-01T09:30:00.000Z'), refreshed: false }));
    expect(store.current().profiles).toEqual({ default: { instagram: saved('2026-08-01T09:30:00.000Z') } });
    expect(logger.calls).toEqual([{ level: 'warn', event: 'instagram.token.refresh-failed', meta: { cause: 'unauthorized' } }]);
  });

  it('when the refreshed token cannot be saved, this run still uses it and a warning names the cause', async () => {
    const { load, logger } = loaderFor(saved('2026-08-01T09:30:00.000Z'), undefined, { update: { kind: 'write-failed', message: 'disk full' } });
    const refreshed = { token: NEW, userId: '17841400000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z', expiresAt: '2026-11-27T09:30:00.000Z' };

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(ok({ credentials: refreshed, refreshed: true }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'instagram.token.save-failed', meta: { cause: 'write-failed' } }]);
  });

  it('a profile with no saved Instagram token fails with missing-credentials, naming the profile', async () => {
    const { load } = loaderFor(saved('2026-09-01T09:30:00.000Z'));

    const result = await load({ profile: profileNameUnsafe('brand-a') });

    expect(result).toEqual(err({ step: 'load', cause: 'missing-credentials', message: 'No Instagram token is configured for the "brand-a" profile.' }));
  });

  it('an unreadable credentials file fails with unreadable, before Instagram is asked anything', async () => {
    const { load, askedWith } = loaderFor(saved('2026-08-01T09:30:00.000Z'), undefined, { load: { kind: 'unreadable', message: 'permission denied' } });

    const result = await load({ profile: DEFAULT_PROFILE });

    expect(result).toEqual(err({ step: 'load', cause: 'unreadable', message: 'permission denied' }));
    expect(askedWith).toEqual([]);
  });
});
