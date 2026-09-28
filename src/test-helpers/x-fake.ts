import type { XImage, XImageFormat } from '../domain/x-image.ts';
import { xPostIdUnsafe } from '../domain/x-post-id.ts';
import { err, ok } from '../domain/result.ts';
import type { X, XAccount, XError, XPostDraft } from '../use-cases/ports/x.ts';

export type XFake = X & {
  // Every post X accepted, edits and replies included, in order, with the id it got.
  readonly posts: ReadonlyArray<XPostDraft & { readonly id: string }>;
  readonly uploads: ReadonlyArray<XImageFormat>;
  readonly deleted: ReadonlyArray<string>;
  // Every call in order, as `upload`, `post`, `reply:<replyTo>`, `edit:<editOf>` or `delete:<id>`.
  readonly events: ReadonlyArray<string>;
};

export type XFakeConfig = {
  readonly account?: XAccount;
  readonly errors?: {
    readonly whoAmI?: XError;
    readonly uploadImage?: XError;
    // Fails the Nth post (1-based), edits and replies counted; the posts before it succeed.
    readonly createPost?: { readonly atPost: number; readonly error: XError };
    // Fails the delete of these ids only.
    readonly deletePost?: { readonly ids: ReadonlyArray<string>; readonly error: XError };
  };
};

const DEFAULT_ACCOUNT: XAccount = { userId: '1600000000000000000', username: 'fake', accessLevel: 'read-write' };

// Ids are predictable: the first post is 1880000000000000001, the second ...002; every upload is media 1890000000000000001.
const postId = (count: number): string => `188000000000000000${count}`;
export const X_FAKE_MEDIA_ID = '1890000000000000001';

const eventOf = (draft: XPostDraft): string => {
  if (draft.editOf !== undefined) return `edit:${draft.editOf}`;
  if (draft.replyTo !== undefined) return `reply:${draft.replyTo}`;
  return 'post';
};

export const createXFake = (config?: XFakeConfig): XFake => {
  const posts: (XPostDraft & { id: string })[] = [];
  const uploads: XImageFormat[] = [];
  const deleted: string[] = [];
  const events: string[] = [];
  const errors = config?.errors;
  return {
    posts,
    uploads,
    deleted,
    events,
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.account ?? DEFAULT_ACCOUNT);
    },
    uploadImage: async (image: XImage) => {
      events.push('upload');
      if (errors?.uploadImage) return err(errors.uploadImage);
      uploads.push(image.format);
      return ok(X_FAKE_MEDIA_ID);
    },
    createPost: async (draft) => {
      events.push(eventOf(draft));
      if (errors?.createPost?.atPost === posts.length + 1) return err(errors.createPost.error);
      const id = postId(posts.length + 1);
      posts.push({ ...draft, id });
      return ok({ id: xPostIdUnsafe(id), url: `https://x.com/i/status/${id}` });
    },
    deletePost: async (id) => {
      events.push(`delete:${id}`);
      if (errors?.deletePost?.ids.includes(id)) return err(errors.deletePost.error);
      deleted.push(id);
      return ok(undefined);
    },
  };
};
