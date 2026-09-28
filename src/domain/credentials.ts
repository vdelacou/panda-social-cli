import type { ProfileName } from './profile-name.ts';
import type { XKeys } from './x-keys.ts';

export type ThreadsCredentials = {
  readonly token: string;
  readonly userId: string;
  readonly username: string;
  // When this token was saved: by setup, or by its last refresh.
  readonly savedAt: string;
  // Known once Threads refreshed the token; a token saved by setup has no expiry the CLI
  // can read without putting the token in a URL (debug_token takes it as a query parameter).
  readonly expiresAt?: string;
};

// X's OAuth 1.0a keys never expire: nothing refreshes them.
export type XCredentials = XKeys & {
  readonly userId: string;
  readonly username: string;
  readonly savedAt: string;
};

// A Page token made from a long-lived user token does not expire (D21): nothing refreshes it.
// The ids are plain strings here, as the file stores them; a reader checks the Page id
// before it reaches a URL.
export type FacebookCredentials = {
  readonly pageId: string;
  readonly pageName: string;
  readonly token: string;
  readonly savedAt: string;
};

export type ProfileCredentials = {
  readonly threads?: ThreadsCredentials;
  readonly x?: XCredentials;
  readonly facebook?: FacebookCredentials;
};

export type CredentialsFile = {
  readonly version: 1;
  readonly profiles: Readonly<Record<string, ProfileCredentials>>;
};

export const EMPTY_CREDENTIALS: CredentialsFile = { version: 1, profiles: {} };

export const withThreadsCredentials = (file: CredentialsFile, profile: ProfileName, threads: ThreadsCredentials): CredentialsFile => ({
  version: 1,
  profiles: { ...file.profiles, [profile]: { ...file.profiles[profile], threads } },
});

// D8: a saved token is refreshed once it is 30 days old, well inside its 60 days and past
// the 24 hours Threads requires, as panda-social-agent does at startup.
export const THREADS_REFRESH_AGE_DAYS = 30;

const DAY_MS = 86_400_000;

export const tokenAgeInDays = (credentials: ThreadsCredentials, now: Date): number => Math.floor((now.getTime() - Date.parse(credentials.savedAt)) / DAY_MS);

export const isRefreshDue = (credentials: ThreadsCredentials, now: Date): boolean => tokenAgeInDays(credentials, now) >= THREADS_REFRESH_AGE_DAYS;

export const refreshedCredentials = (credentials: ThreadsCredentials, refresh: { readonly token: string; readonly expiresInSeconds: number }, now: Date): ThreadsCredentials => ({
  ...credentials,
  token: refresh.token,
  savedAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + refresh.expiresInSeconds * 1000).toISOString(),
});

export const threadsCredentialsFor = (file: CredentialsFile, profile: ProfileName): ThreadsCredentials | undefined =>
  Object.hasOwn(file.profiles, profile) ? file.profiles[profile].threads : undefined;

export const withXCredentials = (file: CredentialsFile, profile: ProfileName, x: XCredentials): CredentialsFile => ({
  version: 1,
  profiles: { ...file.profiles, [profile]: { ...file.profiles[profile], x } },
});

export const xCredentialsFor = (file: CredentialsFile, profile: ProfileName): XCredentials | undefined =>
  Object.hasOwn(file.profiles, profile) ? file.profiles[profile].x : undefined;

export const withFacebookCredentials = (file: CredentialsFile, profile: ProfileName, facebook: FacebookCredentials): CredentialsFile => ({
  version: 1,
  profiles: { ...file.profiles, [profile]: { ...file.profiles[profile], facebook } },
});
