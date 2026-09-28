import type { FacebookPageId, GrantedPage } from '../../domain/facebook-page.ts';
import type { Result } from '../../domain/result.ts';

export type FacebookError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// The Page a Page token belongs to.
export type FacebookPage = {
  readonly id: FacebookPageId;
  readonly name: string;
};

// One adapter per token: a user token lists the Pages it grants, a Page token acts as its Page.
export type Facebook = {
  readonly listPages: () => Promise<Result<ReadonlyArray<GrantedPage>, FacebookError>>;
  readonly whoAmI: () => Promise<Result<FacebookPage, FacebookError>>;
};
