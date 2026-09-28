import { describe, expect, it } from 'bun:test';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createXFake } from '../test-helpers/x-fake.ts';
import { createXStatus } from './x-status.ts';

const ACCOUNT = { userId: '1600000000000000001', username: 'panda', accessLevel: 'read-write' };

describe('the X status', () => {
  it('status x shows the account, the access level of the keys, and when the saved keys were saved', async () => {
    const status = createXStatus({ x: createXFake({ account: ACCOUNT }) });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'saved', savedAt: '2026-09-20T08:00:00.000Z' } });

    expect(result).toEqual(
      ok({
        platform: 'x',
        profile: DEFAULT_PROFILE,
        account: { userId: '1600000000000000001', username: 'panda' },
        accessLevel: 'read-write',
        keys: { source: 'saved', savedAt: '2026-09-20T08:00:00.000Z' },
      })
    );
  });

  it('keys from the environment are reported as coming from the environment', async () => {
    const status = createXStatus({ x: createXFake({ account: ACCOUNT }) });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result.ok && result.value.keys).toEqual({ source: 'environment' });
  });

  it('when X refuses the keys, status fails at the verify step', async () => {
    const status = createXStatus({ x: createXFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'Unauthorized' } } }) });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'Unauthorized' }));
  });
});
