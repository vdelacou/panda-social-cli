import { err, ok } from '../domain/result.ts';
import type { PublishedPost, Threads, ThreadsError } from '../use-cases/ports/threads.ts';

export type ThreadsFake = Threads & {
  readonly published: ReadonlyArray<string>;
};

export type ThreadsFakeConfig = {
  readonly nextPost?: PublishedPost;
  readonly errors?: { readonly publishText?: ThreadsError };
};

export const createThreadsFake = (config?: ThreadsFakeConfig): ThreadsFake => {
  const published: string[] = [];
  return {
    published,
    publishText: async (text) => {
      if (config?.errors?.publishText) return err(config.errors.publishText);
      published.push(text);
      return ok(config?.nextPost ?? { id: '17890000000000000', url: 'https://www.threads.com/@fake/post/Fake' });
    },
  };
};
