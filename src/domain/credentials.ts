import type { ProfileName } from './profile-name.ts';

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

export type ProfileCredentials = {
  readonly threads?: ThreadsCredentials;
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
