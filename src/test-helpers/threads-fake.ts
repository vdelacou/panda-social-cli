import { err, ok } from '../domain/result.ts';
import { threadsPostIdUnsafe } from '../domain/threads-post-id.ts';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import type { PublishedPost, PublishingLimits, RefreshedToken, Threads, ThreadsAccount, ThreadsError } from '../use-cases/ports/threads.ts';

export type ThreadsFake = Threads & {
  readonly published: ReadonlyArray<string>;
  readonly images: ReadonlyArray<{ readonly url: string; readonly text: string | undefined }>;
  readonly replies: ReadonlyArray<{ readonly replyTo: string; readonly text: string; readonly id: string }>;
  readonly deleted: ReadonlyArray<string>;
  // Every call in order, as `text`, `image`, `reply:<replyTo>`, `delete:<id>`, `refresh` or `limits:<userId>`.
  readonly events: ReadonlyArray<string>;
};

export type ThreadsFakeConfig = {
  readonly nextPost?: PublishedPost;
  readonly account?: ThreadsAccount;
  readonly refreshed?: RefreshedToken;
  readonly limits?: PublishingLimits;
  readonly errors?: {
    readonly publishText?: ThreadsError;
    readonly publishImage?: ThreadsError;
    readonly whoAmI?: ThreadsError;
    // Fails the Nth reply (1-based); the replies before it succeed.
    readonly publishReply?: { readonly atReply: number; readonly error: ThreadsError };
    // Fails the delete of these ids only.
    readonly deletePost?: { readonly ids: ReadonlyArray<string>; readonly error: ThreadsError };
    readonly refreshToken?: ThreadsError;
    readonly publishingLimits?: ThreadsError;
  };
};

const DEFAULT_POST: PublishedPost = { id: '17890000000000000', url: 'https://www.threads.com/@fake/post/Fake' };

const DEFAULT_ACCOUNT: ThreadsAccount = { userId: threadsUserIdUnsafe('26000000000000000'), username: 'fake' };

// A refresh gives a new token for 60 days, as Threads does.
const DEFAULT_REFRESH: RefreshedToken = { token: ['refreshed', 'fake', 'token'].join('-'), expiresInSeconds: 5_184_000 };

const DAY = 86_400;

// Nothing used yet of the quotas Threads documents.
const DEFAULT_LIMITS: PublishingLimits = {
  posts: { used: 0, total: 250, windowSeconds: DAY },
  replies: { used: 0, total: 1000, windowSeconds: DAY },
  deletes: { used: 0, total: 100, windowSeconds: DAY },
};

// Reply ids are predictable: the first reply is 17891000000000001, the second ...002.
const replyId = (count: number): string => `1789100000000000${count}`;

export const createThreadsFake = (config?: ThreadsFakeConfig): ThreadsFake => {
  const published: string[] = [];
  const images: { url: string; text: string | undefined }[] = [];
  const replies: { replyTo: string; text: string; id: string }[] = [];
  const deleted: string[] = [];
  const events: string[] = [];
  const errors = config?.errors;
  return {
    published,
    images,
    replies,
    deleted,
    events,
    publishText: async (text) => {
      events.push('text');
      if (errors?.publishText) return err(errors.publishText);
      published.push(text);
      return ok(config?.nextPost ?? DEFAULT_POST);
    },
    publishImage: async (imageUrl, text) => {
      events.push('image');
      if (errors?.publishImage) return err(errors.publishImage);
      images.push({ url: imageUrl, text });
      return ok(config?.nextPost ?? DEFAULT_POST);
    },
    publishReply: async (replyTo, text) => {
      events.push(`reply:${replyTo}`);
      if (errors?.publishReply?.atReply === replies.length + 1) return err(errors.publishReply.error);
      const id = replyId(replies.length + 1);
      replies.push({ replyTo, text, id });
      return ok(threadsPostIdUnsafe(id));
    },
    deletePost: async (id) => {
      events.push(`delete:${id}`);
      if (errors?.deletePost?.ids.includes(id)) return err(errors.deletePost.error);
      deleted.push(id);
      return ok(undefined);
    },
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.account ?? DEFAULT_ACCOUNT);
    },
    refreshToken: async () => {
      events.push('refresh');
      if (errors?.refreshToken) return err(errors.refreshToken);
      return ok(config?.refreshed ?? DEFAULT_REFRESH);
    },
    publishingLimits: async (userId) => {
      events.push(`limits:${userId}`);
      if (errors?.publishingLimits) return err(errors.publishingLimits);
      return ok(config?.limits ?? DEFAULT_LIMITS);
    },
  };
};
