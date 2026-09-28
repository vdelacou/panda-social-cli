import { describe, expect, it } from 'bun:test';
import type { InstagramCredentials } from '../domain/credentials.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createInstagramFake } from '../test-helpers/instagram-fake.ts';
import { createInstagramStatus } from './instagram-status.ts';
import type { Quota } from './ports/instagram.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const ACCOUNT = { userId: instagramUserIdUnsafe('17841400000000001'), username: 'panda' };
const POSTS: Quota = { used: 2, total: 50, windowSeconds: 86_400 };

const credentials = (savedAt: string, expiresAt?: string): InstagramCredentials => ({
  token: ['saved', 'instagram', 'token'].join('-'),
  userId: ACCOUNT.userId,
  username: 'panda',
  savedAt,
  ...(expiresAt !== undefined && { expiresAt }),
});

describe('the Instagram status', () => {
  it('status shows the account, the saved token age in whole days and the posts quota, read for the id /me gave', async () => {
    const instagram = createInstagramFake({ account: ACCOUNT, limit: POSTS });
    const status = createInstagramStatus({ instagram, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'saved', credentials: credentials('2026-09-15T10:30:00.000Z'), refreshed: false } });

    expect(result).toEqual(
      ok({
        platform: 'instagram',
        profile: DEFAULT_PROFILE,
        account: ACCOUNT,
        token: { source: 'saved', savedAt: '2026-09-15T10:30:00.000Z', ageDays: 12, expiresAt: null, refreshed: false },
        limits: { posts: POSTS },
      })
    );
    expect(instagram.events).toEqual(['limit:17841400000000001']);
  });

  it('right after a refresh, status shows the new expiry and that this run refreshed the token', async () => {
    const status = createInstagramStatus({ instagram: createInstagramFake({ account: ACCOUNT, limit: POSTS }), now: () => NOW });

    const result = await status({
      profile: DEFAULT_PROFILE,
      origin: { source: 'saved', credentials: credentials('2026-09-28T09:30:00.000Z', '2026-11-27T09:30:00.000Z'), refreshed: true },
    });

    expect(result.ok && result.value.token).toEqual({ source: 'saved', savedAt: '2026-09-28T09:30:00.000Z', ageDays: 0, expiresAt: '2026-11-27T09:30:00.000Z', refreshed: true });
  });

  it('a token from PANDA_SOCIAL_INSTAGRAM_TOKEN is reported as coming from the environment, with no age', async () => {
    const status = createInstagramStatus({ instagram: createInstagramFake({ account: ACCOUNT, limit: POSTS }), now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result.ok && result.value.token).toEqual({ source: 'environment' });
  });

  it('when Instagram refuses the token, status fails at the verify step with unauthorized, and no quota is read', async () => {
    const instagram = createInstagramFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'token refused' } } });
    const status = createInstagramStatus({ instagram, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'token refused' }));
    expect(instagram.events).toEqual([]);
  });

  it('when the quota cannot be read, status fails at the limits step with the cause Instagram gave', async () => {
    const instagram = createInstagramFake({ account: ACCOUNT, errors: { publishingLimit: { kind: 'forbidden', message: 'missing permission' } } });
    const status = createInstagramStatus({ instagram, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'limits', cause: 'forbidden', message: 'missing permission' }));
  });
});
