import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Instagram, InstagramAccount, InstagramError, Quota, RefreshedToken } from '../use-cases/ports/instagram.ts';

export type InstagramFake = Instagram & {
  // Every call but whoAmI, in order, as `refresh` or `limit:<userId>`.
  readonly events: ReadonlyArray<string>;
};

export type InstagramFakeConfig = {
  readonly account?: InstagramAccount;
  readonly refreshed?: RefreshedToken;
  readonly limit?: Quota;
  readonly errors?: {
    readonly whoAmI?: InstagramError;
    readonly refreshToken?: InstagramError;
    readonly publishingLimit?: InstagramError;
  };
};

const DEFAULT_ACCOUNT: InstagramAccount = { userId: instagramUserIdUnsafe('17841400000000000'), username: 'fake' };

// A refresh gives a new token for 60 days, as Instagram does.
const DEFAULT_REFRESH: RefreshedToken = { token: ['refreshed', 'fake', 'token'].join('-'), expiresInSeconds: 5_184_000 };

// Nothing used yet of the 50 posts per 24 hours Meta's reference gives.
const DEFAULT_LIMIT: Quota = { used: 0, total: 50, windowSeconds: 86_400 };

export const createInstagramFake = (config?: InstagramFakeConfig): InstagramFake => {
  const events: string[] = [];
  const errors = config?.errors;
  return {
    events,
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.account ?? DEFAULT_ACCOUNT);
    },
    refreshToken: async () => {
      events.push('refresh');
      if (errors?.refreshToken) return err(errors.refreshToken);
      return ok(config?.refreshed ?? DEFAULT_REFRESH);
    },
    publishingLimit: async (userId) => {
      events.push(`limit:${userId}`);
      if (errors?.publishingLimit) return err(errors.publishingLimit);
      return ok(config?.limit ?? DEFAULT_LIMIT);
    },
  };
};
