import type { Result } from '../../domain/result.ts';

// `url` is null when the post went out but its permalink could not be read back:
// the post exists, so reporting a failure would invite a duplicate on retry.
export type PublishedPost = {
  readonly id: string;
  readonly url: string | null;
};

export type ThreadsAccount = {
  readonly userId: string;
  readonly username: string;
};

export type ThreadsError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

export type Threads = {
  readonly publishText: (text: string) => Promise<Result<PublishedPost, ThreadsError>>;
  readonly whoAmI: () => Promise<Result<ThreadsAccount, ThreadsError>>;
};
