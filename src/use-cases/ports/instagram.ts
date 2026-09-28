import type { InstagramUserId } from '../../domain/instagram-user-id.ts';
import type { Result } from '../../domain/result.ts';
import type { Quota, RefreshedToken } from './threads.ts';

// Instagram renews a token and counts posts in the shapes Threads uses.
export type { Quota, RefreshedToken } from './threads.ts';

export type InstagramAccount = {
  readonly userId: InstagramUserId;
  readonly username: string;
};

export type InstagramError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// An Instagram professional account under Instagram Login (D30): whose token it is, its
// renewal, and the rolling 24-hour posts quota. The account id is branded (rule 12), and the
// adapter checks the one Instagram hands back before it leaves.
export type Instagram = {
  readonly whoAmI: () => Promise<Result<InstagramAccount, InstagramError>>;
  readonly refreshToken: () => Promise<Result<RefreshedToken, InstagramError>>;
  readonly publishingLimit: (userId: InstagramUserId) => Promise<Result<Quota, InstagramError>>;
};
