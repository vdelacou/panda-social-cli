import { instagramMediaIdUnsafe } from '../domain/instagram-media-id.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Instagram, InstagramAccount, InstagramError, InstagramPublishedPost, Quota, RefreshedToken } from '../use-cases/ports/instagram.ts';

// One image as Instagram published it: the account it went to, the URL it downloaded and the caption.
export type InstagramFakePost = {
  readonly userId: string;
  readonly imageUrl: string;
  readonly caption?: string;
};

export type InstagramFake = Instagram & {
  readonly posts: ReadonlyArray<InstagramFakePost>;
  // Every call but whoAmI, in order, as `refresh`, `limit:<userId>` or `publish:<userId>`.
  readonly events: ReadonlyArray<string>;
};

export type InstagramFakeConfig = {
  readonly account?: InstagramAccount;
  readonly refreshed?: RefreshedToken;
  readonly limit?: Quota;
  readonly nextPost?: InstagramPublishedPost;
  readonly errors?: {
    readonly whoAmI?: InstagramError;
    readonly refreshToken?: InstagramError;
    readonly publishingLimit?: InstagramError;
    readonly publishImage?: InstagramError;
  };
};

const DEFAULT_ACCOUNT: InstagramAccount = { userId: instagramUserIdUnsafe('17841400000000000'), username: 'fake' };

// A refresh gives a new token for 60 days, as Instagram does.
const DEFAULT_REFRESH: RefreshedToken = { token: ['refreshed', 'fake', 'token'].join('-'), expiresInSeconds: 5_184_000 };

// Nothing used yet of the 50 posts per 24 hours Meta's reference gives.
const DEFAULT_LIMIT: Quota = { used: 0, total: 50, windowSeconds: 86_400 };

const DEFAULT_POST: InstagramPublishedPost = { id: instagramMediaIdUnsafe('17900000000000001'), url: 'https://www.instagram.com/p/Fake/' };

export const createInstagramFake = (config?: InstagramFakeConfig): InstagramFake => {
  const posts: InstagramFakePost[] = [];
  const events: string[] = [];
  const errors = config?.errors;
  return {
    posts,
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
    publishImage: async (userId, imageUrl, caption) => {
      events.push(`publish:${userId}`);
      if (errors?.publishImage) return err(errors.publishImage);
      posts.push({ userId, imageUrl, ...(caption !== undefined && { caption }) });
      return ok(config?.nextPost ?? DEFAULT_POST);
    },
  };
};
