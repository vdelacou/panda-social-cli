import type { ImagePath } from './image-path.ts';
import type { ImageUrl } from './image-url.ts';

// What a Page post carries: a text, an image (a URL Facebook downloads, or a local file the CLI
// uploads, D26), or both. A post with neither cannot be written down.
export type FacebookTextPost = {
  readonly text: string;
  readonly imageUrl?: undefined;
  readonly imagePath?: undefined;
};

export type FacebookPhotoPost =
  | { readonly text?: string; readonly imageUrl: ImageUrl; readonly imagePath?: undefined }
  | { readonly text?: string; readonly imageUrl?: undefined; readonly imagePath: ImagePath };

export type FacebookPostContent = FacebookTextPost | FacebookPhotoPost;

// A post without an image goes to the feed; with one, to the photos, the text as its caption.
export const isTextPost = (content: FacebookPostContent): content is FacebookTextPost => content.imageUrl === undefined && content.imagePath === undefined;
