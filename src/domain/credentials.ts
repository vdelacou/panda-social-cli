import type { ProfileName } from './profile-name.ts';

export type ThreadsCredentials = {
  readonly token: string;
  readonly userId: string;
  readonly username: string;
  readonly savedAt: string;
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

export const threadsCredentialsFor = (file: CredentialsFile, profile: ProfileName): ThreadsCredentials | undefined =>
  Object.hasOwn(file.profiles, profile) ? file.profiles[profile].threads : undefined;
