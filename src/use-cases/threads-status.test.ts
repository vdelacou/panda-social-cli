import { describe, expect, it } from 'bun:test';
import type { ThreadsCredentials } from '../domain/credentials.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import type { PublishingLimits } from './ports/threads.ts';
import { createThreadsStatus } from './threads-status.ts';

const NOW = new Date('2026-09-28T09:30:00.000Z');
const ACCOUNT = { userId: threadsUserIdUnsafe('26000000000000001'), username: 'panda' };
const DAY = 86_400;
const LIMITS: PublishingLimits = {
  posts: { used: 3, total: 250, windowSeconds: DAY },
  replies: { used: 10, total: 1000, windowSeconds: DAY },
  deletes: { used: 1, total: 100, windowSeconds: DAY },
};

const credentials = (savedAt: string, expiresAt?: string): ThreadsCredentials => ({
  token: ['saved', 'threads', 'token'].join('-'),
  userId: ACCOUNT.userId,
  username: 'panda',
  savedAt,
  ...(expiresAt !== undefined && { expiresAt }),
});

describe('the Threads status', () => {
  it('status shows the account, the saved token age in whole days and the three quotas, read for the id /me gave', async () => {
    const threads = createThreadsFake({ account: ACCOUNT, limits: LIMITS });
    const status = createThreadsStatus({ threads, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'saved', credentials: credentials('2026-09-15T10:30:00.000Z'), refreshed: false } });

    expect(result).toEqual(
      ok({
        platform: 'threads',
        profile: DEFAULT_PROFILE,
        account: ACCOUNT,
        token: { source: 'saved', savedAt: '2026-09-15T10:30:00.000Z', ageDays: 12, expiresAt: null, refreshed: false },
        limits: LIMITS,
      })
    );
    expect(threads.events).toEqual(['limits:26000000000000001']);
  });

  it('right after a refresh, status shows the new expiry and that this run refreshed the token', async () => {
    const status = createThreadsStatus({ threads: createThreadsFake({ account: ACCOUNT, limits: LIMITS }), now: () => NOW });

    const result = await status({
      profile: DEFAULT_PROFILE,
      origin: { source: 'saved', credentials: credentials('2026-09-28T09:30:00.000Z', '2026-11-27T09:30:00.000Z'), refreshed: true },
    });

    expect(result.ok && result.value.token).toEqual({ source: 'saved', savedAt: '2026-09-28T09:30:00.000Z', ageDays: 0, expiresAt: '2026-11-27T09:30:00.000Z', refreshed: true });
  });

  it('a token from PANDA_SOCIAL_THREADS_TOKEN is reported as coming from the environment, with no age', async () => {
    const status = createThreadsStatus({ threads: createThreadsFake({ account: ACCOUNT, limits: LIMITS }), now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result.ok && result.value.token).toEqual({ source: 'environment' });
  });

  it('when Threads refuses the token, status fails at the verify step with unauthorized, and no quota is read', async () => {
    const threads = createThreadsFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'token refused' } } });
    const status = createThreadsStatus({ threads, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'token refused' }));
    expect(threads.events).toEqual([]);
  });

  it('when the quotas cannot be read, status fails at the limits step with the cause Threads gave', async () => {
    const threads = createThreadsFake({ account: ACCOUNT, errors: { publishingLimits: { kind: 'forbidden', message: 'missing permission' } } });
    const status = createThreadsStatus({ threads, now: () => NOW });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'limits', cause: 'forbidden', message: 'missing permission' }));
  });
});
