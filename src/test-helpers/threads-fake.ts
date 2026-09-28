import { err, ok } from '../domain/result.ts';
import type { PublishedPost, Threads, ThreadsAccount, ThreadsError } from '../use-cases/ports/threads.ts';

export type ThreadsFake = Threads & {
  readonly published: ReadonlyArray<string>;
  readonly images: ReadonlyArray<{ readonly url: string; readonly text: string | undefined }>;
  // Every publish in order, as `text` or `image`.
  readonly events: ReadonlyArray<string>;
};

export type ThreadsFakeConfig = {
  readonly nextPost?: PublishedPost;
  readonly account?: ThreadsAccount;
  readonly errors?: {
    readonly publishText?: ThreadsError;
    readonly publishImage?: ThreadsError;
    readonly whoAmI?: ThreadsError;
  };
};

const DEFAULT_POST: PublishedPost = { id: '17890000000000000', url: 'https://www.threads.com/@fake/post/Fake' };

export const createThreadsFake = (config?: ThreadsFakeConfig): ThreadsFake => {
  const published: string[] = [];
  const images: { url: string; text: string | undefined }[] = [];
  const events: string[] = [];
  const errors = config?.errors;
  return {
    published,
    images,
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
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.account ?? { userId: '26000000000000000', username: 'fake' });
    },
  };
};
