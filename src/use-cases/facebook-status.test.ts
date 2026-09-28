import { describe, expect, it } from 'bun:test';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import { DEFAULT_PROFILE } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import { createFacebookFake } from '../test-helpers/facebook-fake.ts';
import { createFacebookStatus } from './facebook-status.ts';

const PAGE = { id: facebookPageIdUnsafe('104000000000001'), name: 'Panda Bakery' };

describe('the Facebook status', () => {
  it('status facebook shows the Page the token belongs to, and when the saved token was saved', async () => {
    const status = createFacebookStatus({ facebook: createFacebookFake({ page: PAGE }) });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'saved', savedAt: '2026-09-20T08:00:00.000Z' } });

    expect(result).toEqual(ok({ platform: 'facebook', profile: DEFAULT_PROFILE, page: PAGE, token: { source: 'saved', savedAt: '2026-09-20T08:00:00.000Z' } }));
  });

  it('a token from the environment is reported as coming from the environment', async () => {
    const status = createFacebookStatus({ facebook: createFacebookFake({ page: PAGE }) });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result.ok && result.value.token).toEqual({ source: 'environment' });
  });

  it('when Meta refuses the token, status fails at the verify step', async () => {
    const status = createFacebookStatus({
      facebook: createFacebookFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'Error validating access token: Session has expired.' } } }),
    });

    const result = await status({ profile: DEFAULT_PROFILE, origin: { source: 'environment' } });

    expect(result).toEqual(err({ step: 'verify', cause: 'unauthorized', message: 'Error validating access token: Session has expired.' }));
  });
});
