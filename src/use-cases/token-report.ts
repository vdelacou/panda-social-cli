import { tokenAgeInDays } from '../domain/token-renewal.ts';
import type { RenewableToken } from '../domain/token-renewal.ts';

// Where a renewing token (Threads, Instagram) came from: its environment variable, or the
// profile's saved credentials as this run loaded them, renewed or not.
export type RenewableTokenOrigin = { readonly source: 'environment' } | { readonly source: 'saved'; readonly credentials: RenewableToken; readonly refreshed: boolean };

export type TokenReport =
  | { readonly source: 'environment' }
  | { readonly source: 'saved'; readonly savedAt: string; readonly ageDays: number; readonly expiresAt: string | null; readonly refreshed: boolean };

export const tokenReport = (origin: RenewableTokenOrigin, now: Date): TokenReport => {
  if (origin.source === 'environment') return { source: 'environment' };
  const { credentials } = origin;
  return { source: 'saved', savedAt: credentials.savedAt, ageDays: tokenAgeInDays(credentials, now), expiresAt: credentials.expiresAt ?? null, refreshed: origin.refreshed };
};
