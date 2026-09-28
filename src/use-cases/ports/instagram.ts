import type { ImageUrl } from '../../domain/image-url.ts';
import type { InstagramMediaId } from '../../domain/instagram-media-id.ts';
import type { InstagramUserId } from '../../domain/instagram-user-id.ts';
import type { Result } from '../../domain/result.ts';
import type { Quota, RefreshedToken } from './threads.ts';

// Instagram renews a token and counts posts in the shapes Threads uses.
export type { Quota, RefreshedToken } from './threads.ts';

export type InstagramAccount = {
  readonly userId: InstagramUserId;
  readonly username: string;
};

// `url` is null when the post went out but its permalink could not be read back: the post
// exists, so reporting a failure would invite a duplicate on retry.
export type InstagramPublishedPost = {
  readonly id: InstagramMediaId;
  readonly url: string | null;
};

export type InstagramError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'image-rejected'; readonly message: string }
  | { readonly kind: 'still-processing'; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// An Instagram professional account under Instagram Login (D30): whose token it is, its
// renewal, the rolling 24-hour posts quota, and an image published with its caption (D35).
// Ids that go into a URL are branded (rule 12), and the adapter checks the ones Instagram
// hands back before they leave.
export type Instagram = {
  readonly whoAmI: () => Promise<Result<InstagramAccount, InstagramError>>;
  readonly refreshToken: () => Promise<Result<RefreshedToken, InstagramError>>;
  readonly publishingLimit: (userId: InstagramUserId) => Promise<Result<Quota, InstagramError>>;
  readonly publishImage: (userId: InstagramUserId, imageUrl: ImageUrl, caption: string | undefined) => Promise<Result<InstagramPublishedPost, InstagramError>>;
};
