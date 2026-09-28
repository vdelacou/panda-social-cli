import type { FacebookImage } from '../../domain/facebook-image.ts';
import type { FacebookPageId, GrantedPage } from '../../domain/facebook-page.ts';
import type { FacebookPostId } from '../../domain/facebook-post-id.ts';
import type { ImageUrl } from '../../domain/image-url.ts';
import type { Result } from '../../domain/result.ts';

export type FacebookError =
  | { readonly kind: 'unauthorized'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'rate-limited'; readonly message: string }
  | { readonly kind: 'image-rejected'; readonly message: string }
  | { readonly kind: 'duplicate-text'; readonly message: string }
  | { readonly kind: 'rejected'; readonly status: number; readonly message: string }
  | { readonly kind: 'network-failed'; readonly message: string }
  | { readonly kind: 'timeout'; readonly message: string };

// The Page a Page token belongs to.
export type FacebookPage = {
  readonly id: FacebookPageId;
  readonly name: string;
};

// A photo Facebook downloads from a public https URL, or one uploaded with the call (D26).
export type FacebookPhoto = { readonly kind: 'url'; readonly url: ImageUrl } | { readonly kind: 'upload'; readonly image: FacebookImage };

// A post as Facebook has it: its id and its link.
export type FacebookPublishedPost = {
  readonly id: FacebookPostId;
  readonly url: string;
};

// One adapter per token: a user token lists the Pages it grants, a Page token acts as its Page.
export type Facebook = {
  readonly listPages: () => Promise<Result<ReadonlyArray<GrantedPage>, FacebookError>>;
  readonly whoAmI: () => Promise<Result<FacebookPage, FacebookError>>;
  readonly publishText: (pageId: FacebookPageId, text: string) => Promise<Result<FacebookPublishedPost, FacebookError>>;
  // The caption is absent for a photo posted without text.
  readonly publishPhoto: (pageId: FacebookPageId, photo: FacebookPhoto, caption: string | undefined) => Promise<Result<FacebookPublishedPost, FacebookError>>;
  // Meta edits only posts this app made (D27); the post keeps its id and link.
  readonly editText: (id: FacebookPostId, text: string) => Promise<Result<FacebookPublishedPost, FacebookError>>;
  readonly deletePost: (id: FacebookPostId) => Promise<Result<void, FacebookError>>;
};
