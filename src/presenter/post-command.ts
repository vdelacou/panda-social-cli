import type { FacebookPostContent } from '../domain/facebook-post.ts';
import type { FacebookPostId } from '../domain/facebook-post-id.ts';
import type { ImagePath } from '../domain/image-path.ts';
import type { ImageUrl } from '../domain/image-url.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { XPostId } from '../domain/x-post-id.ts';

export type Platform = 'threads' | 'x' | 'facebook';

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

// The platform a post goes to, with the content it takes there.
export type PlatformContent =
  (ThreadsPostContent & { readonly platform: 'threads' }) | (XPostContent & { readonly platform: 'x' }) | (FacebookPostContent & { readonly platform: 'facebook' });

// The post a delete or an update acts on, its id in the shape its platform gives.
export type PostTarget =
  { readonly platform: 'threads'; readonly id: ThreadsPostId } | { readonly platform: 'x'; readonly id: XPostId } | { readonly platform: 'facebook'; readonly id: FacebookPostId };

// `profile` is absent when --profile is not given: the default profile applies.
type Owned = { readonly profile?: ProfileName };

export type ThreadsPostCommand = ThreadsPostContent & Owned & { readonly command: 'post'; readonly platform: 'threads' };
export type XPostCommand = XPostContent & Owned & { readonly command: 'post'; readonly platform: 'x' };
export type FacebookPostCommand = FacebookPostContent & Owned & { readonly command: 'post'; readonly platform: 'facebook' };
export type PostCommand = ThreadsPostCommand | XPostCommand | FacebookPostCommand;

export type ThreadsDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'threads'; readonly id: ThreadsPostId };
export type XDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'x'; readonly id: XPostId };
export type FacebookDeleteCommand = Owned & { readonly command: 'delete'; readonly platform: 'facebook'; readonly id: FacebookPostId };
export type DeleteCommand = ThreadsDeleteCommand | XDeleteCommand | FacebookDeleteCommand;

export type ThreadsUpdateCommand = ThreadsPostContent & Owned & { readonly command: 'update'; readonly platform: 'threads'; readonly id: ThreadsPostId; readonly repost: boolean };
export type XUpdateCommand = XPostContent & Owned & { readonly command: 'update'; readonly platform: 'x'; readonly id: XPostId; readonly repost: boolean };
export type FacebookUpdateCommand = FacebookPostContent &
  Owned & { readonly command: 'update'; readonly platform: 'facebook'; readonly id: FacebookPostId; readonly repost: boolean };
export type UpdateCommand = ThreadsUpdateCommand | XUpdateCommand | FacebookUpdateCommand;
