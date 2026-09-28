import type { Result } from '../../domain/result.ts';
import type { XImage } from '../../domain/x-image.ts';
import type { XPostId } from '../../domain/x-post-id.ts';

export type XError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'credits-depleted'; readonly message: string }
  | { readonly kind: 'read-only-keys'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'duplicate-text'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// `accessLevel` is X's `x-access-level` answer for these keys ('read', 'read-write' or
// 'read-write-directmessages'), or null when X sent none.
export type XAccount = {
  readonly userId: string;
  readonly username: string;
  readonly accessLevel: string | null;
};

// One post as X creates it: a new post, a reply in a thread, or a new version of a post
// (an edit, which X answers with a new id). `text` may be empty beside an image.
export type XPostDraft = {
  readonly text: string;
  readonly mediaIds?: ReadonlyArray<string>;
  readonly replyTo?: XPostId;
  readonly editOf?: XPostId;
};

export type XPublishedPost = {
  readonly id: XPostId;
  readonly url: string;
};

export type X = {
  readonly whoAmI: () => Promise<Result<XAccount, XError>>;
  // Answers the media id to attach to a post.
  readonly uploadImage: (image: XImage) => Promise<Result<string, XError>>;
  readonly createPost: (draft: XPostDraft) => Promise<Result<XPublishedPost, XError>>;
  readonly deletePost: (id: XPostId) => Promise<Result<void, XError>>;
};
