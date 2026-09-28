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

// Instagram Login (D31): the token renews as the Threads one does, and `userId` is the
// professional account id, checked before it reaches a URL.
export type InstagramCredentials = {
  readonly token: string;
  readonly userId: string;
  readonly username: string;
  readonly savedAt: string;
  readonly expiresAt?: string;
};

export type ProfileCredentials = {
  readonly threads?: ThreadsCredentials;
  readonly x?: XCredentials;
  readonly facebook?: FacebookCredentials;
  readonly instagram?: InstagramCredentials;
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

export const facebookCredentialsFor = (file: CredentialsFile, profile: ProfileName): FacebookCredentials | undefined =>
  Object.hasOwn(file.profiles, profile) ? file.profiles[profile].facebook : undefined;

export const withInstagramCredentials = (file: CredentialsFile, profile: ProfileName, instagram: InstagramCredentials): CredentialsFile => ({
  version: 1,
  profiles: { ...file.profiles, [profile]: { ...file.profiles[profile], instagram } },
});
