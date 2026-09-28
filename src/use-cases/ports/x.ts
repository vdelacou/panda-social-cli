import type { Result } from '../../domain/result.ts';

export type XError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'credits-depleted'; readonly message: string }
  | { readonly kind: 'read-only-keys'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
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

export type X = {
  readonly whoAmI: () => Promise<Result<XAccount, XError>>;
};
