import type { FacebookPostContent } from '../domain/facebook-post.ts';
import type { FacebookPostId } from '../domain/facebook-post-id.ts';
import type { ImagePath } from '../domain/image-path.ts';
import type { ImageUrl } from '../domain/image-url.ts';
import type { InstagramMediaId } from '../domain/instagram-media-id.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { XPostId } from '../domain/x-post-id.ts';

export type Platform = 'threads' | 'x' | 'facebook' | 'instagram';

// What a post carries; each key is absent rather than empty when its flag is not given.
// Threads downloads its image from a URL; on X the CLI uploads a local file (D14).
export type ThreadsPostContent = {
  readonly text?: string;
  readonly imageUrl?: ImageUrl;
  readonly split?: true;
};

export type XPostContent = {
  readonly text?: string;
  readonly imagePath?: ImagePath;
  readonly split?: true;
};

// Facebook takes either kind of image (D26), and a long text whole, so nothing is split there.
export type { FacebookPostContent } from '../domain/facebook-post.ts';

// Instagram downloads its image from a URL and has no text-only post (D34): the text is the
// caption, sent whole.
export type InstagramPostContent = {
  readonly imageUrl: ImageUrl;
  readonly text?: string;
};

// The platform a post goes to, with the content it takes there.
export type PlatformContent =
  | (ThreadsPostContent & { readonly platform: 'threads' })
  | (XPostContent & { readonly platform: 'x' })
  | (FacebookPostContent & { readonly platform: 'facebook' })
  | (InstagramPostContent & { readonly platform: 'instagram' });

// The post a delete or an update acts on, its id in the shape its platform gives.
export type PostTarget =
  | { readonly platform: 'threads'; readonly id: ThreadsPostId }
  | { readonly platform: 'x'; readonly id: XPostId }
  | { readonly platform: 'facebook'; readonly id: FacebookPostId }
  | { readonly platform: 'instagram'; readonly id: InstagramMediaId };

// `profile` is absent when --profile is not given: the default profile applies.
type Owned = { readonly profile?: ProfileName };

export type ThreadsPostCommand = ThreadsPostContent & Owned & { readonly command: 'post'; readonly platform: 'threads' };
export type XPostCommand = XPostContent & Owned & { readonly command: 'post'; readonly platform: 'x' };
export type FacebookPostCommand = FacebookPostContent & Owned & { readonly command: 'post'; readonly platform: 'facebook' };
export type InstagramPostCommand = InstagramPostContent & Owned & { readonly command: 'post'; readonly platform: 'instagram' };
export type PostCommand = ThreadsPostCommand | XPostCommand | FacebookPostCommand | InstagramPostCommand;

export type ThreadsDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'threads'; readonly id: ThreadsPostId };
export type XDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'x'; readonly id: XPostId };
export type FacebookDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'facebook'; readonly id: FacebookPostId };
export type InstagramDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'instagram'; readonly id: InstagramMediaId };
export type DeleteCommand = ThreadsDeleteCommand | XDeleteCommand | FacebookDeleteCommand | InstagramDeleteCommand;

export type ThreadsUpdateCommand = ThreadsPostContent & Owned & { readonly command: 'update'; readonly platform: 'threads'; readonly id: ThreadsPostId; readonly repost: boolean };
export type XUpdateCommand = XPostContent & Owned & { readonly command: 'update'; readonly platform: 'x'; readonly id: XPostId; readonly repost: boolean };
export type FacebookUpdateCommand = FacebookPostContent &
  Owned & { readonly command: 'update'; readonly platform: 'facebook'; readonly id: FacebookPostId; readonly repost: boolean };
// Instagram Login edits nothing (D37), so an update there names its post and carries no content.
export type InstagramUpdateCommand = Owned & { readonly command: 'update'; readonly platform: 'instagram'; readonly id: InstagramMediaId; readonly repost: boolean };
export type UpdateCommand = ThreadsUpdateCommand | XUpdateCommand | FacebookUpdateCommand | InstagramUpdateCommand;
