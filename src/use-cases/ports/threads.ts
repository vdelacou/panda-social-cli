import type { ImageUrl } from '../../domain/image-url.ts';
import type { Result } from '../../domain/result.ts';
import type { ThreadsPostId } from '../../domain/threads-post-id.ts';

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
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'image-rejected'; readonly message: string }
  | { readonly kind: 'still-processing'; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// Ids that go into a Threads URL are branded (rule 12); ids Threads hands back are checked
// by the adapter before they leave it.
export type Threads = {
  readonly publishText: (text: string) => Promise<Result<PublishedPost, ThreadsError>>;
  readonly publishImage: (imageUrl: ImageUrl, text: string | undefined) => Promise<Result<PublishedPost, ThreadsError>>;
  readonly publishReply: (replyTo: ThreadsPostId, text: string) => Promise<Result<ThreadsPostId, ThreadsError>>;
  readonly deletePost: (id: ThreadsPostId) => Promise<Result<void, ThreadsError>>;
  readonly whoAmI: () => Promise<Result<ThreadsAccount, ThreadsError>>;
};
