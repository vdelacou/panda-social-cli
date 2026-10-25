import { describe, expect, it } from 'bun:test';
import { facebookCredentialsFor, withFacebookCredentials, withXCredentials, xCredentialsFor } from './credentials.ts';
import type { CredentialsFile } from './credentials.ts';
import { DEFAULT_PROFILE, profileNameUnsafe } from './profile-name.ts';

const EMPTY: CredentialsFile = { version: 1, profiles: {} };
const WORK = profileNameUnsafe('work');
const SAVED_AT = '2026-10-25T08:00:00.000Z';
const secret = (...parts: ReadonlyArray<string>): string => parts.join('-');

describe('reading the saved accounts of a profile', () => {
  it('the X account saved under a profile is the one read back, and another profile has none', () => {
    const x = {
      apiKey: secret('x', 'key'),
      apiSecret: secret('x', 'secret'),
      accessToken: secret('x', 'token'),
      accessSecret: secret('x', 'access'),
      userId: '1500000000000000001',
      username: 'panda',
      savedAt: SAVED_AT,
    };
    const file = withXCredentials(EMPTY, DEFAULT_PROFILE, x);

    expect(xCredentialsFor(file, DEFAULT_PROFILE)).toEqual(x);
    expect(xCredentialsFor(file, WORK)).toBeUndefined();
  });

  it('the Facebook Page saved under a profile is the one read back, and another profile has none', () => {
    const facebook = { pageId: '104000000000002', pageName: 'Panda Page', token: secret('page', 'token'), savedAt: SAVED_AT };
    const file = withFacebookCredentials(EMPTY, DEFAULT_PROFILE, facebook);

    expect(facebookCredentialsFor(file, DEFAULT_PROFILE)).toEqual(facebook);
    expect(facebookCredentialsFor(file, WORK)).toBeUndefined();
  });
});
