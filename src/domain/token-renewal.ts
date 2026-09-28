// D8 and D31: a Threads or Instagram token lives 60 days, and a saved one is renewed once it
// is 30 days old, well inside that and past the 24 hours both platforms require, as
// panda-social-agent does at startup.
const TOKEN_RENEWAL_AGE_DAYS = 30;

const DAY_MS = 86_400_000;

// A saved token that renews: when it was saved (by setup or by its last renewal), and when it
// expires once a renewal said so.
export type RenewableToken = {
  readonly token: string;
  readonly savedAt: string;
  readonly expiresAt?: string;
};

export const tokenAgeInDays = (credentials: RenewableToken, now: Date): number => Math.floor((now.getTime() - Date.parse(credentials.savedAt)) / DAY_MS);

export const isRefreshDue = (credentials: RenewableToken, now: Date): boolean => tokenAgeInDays(credentials, now) >= TOKEN_RENEWAL_AGE_DAYS;

export const refreshedCredentials = <C extends RenewableToken>(credentials: C, refresh: { readonly token: string; readonly expiresInSeconds: number }, now: Date): C => ({
  ...credentials,
  token: refresh.token,
  savedAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + refresh.expiresInSeconds * 1000).toISOString(),
});
