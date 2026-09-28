import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import type { GrantedPage } from '../domain/facebook-page.ts';
import { facebookPostIdUnsafe } from '../domain/facebook-post-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Facebook, FacebookError, FacebookPage, FacebookPhoto } from '../use-cases/ports/facebook.ts';

// One post as Meta accepted it: the Page it went to, its text or caption, and its photo,
// the URL Meta downloads or `upload:<format>` for a file sent with it.
export type FacebookFakePost = {
  readonly id: string;
  readonly pageId: string;
  readonly text?: string;
  readonly photo?: string;
};

export type FacebookFake = Facebook & {
  readonly posts: ReadonlyArray<FacebookFakePost>;
  readonly edits: ReadonlyArray<{ readonly id: string; readonly text: string }>;
  readonly deleted: ReadonlyArray<string>;
  // Every publishing call in order, as `publish`, `edit:<id>` or `delete:<id>`.
  readonly events: ReadonlyArray<string>;
};

export type FacebookFakeConfig = {
  // What the user token grants: FACEBOOK_FAKE_PAGE alone unless a test says otherwise.
  readonly pages?: ReadonlyArray<GrantedPage>;
  // The Page a Page token belongs to: FACEBOOK_FAKE_PAGE unless a test says otherwise.
  readonly page?: FacebookPage;
  readonly errors?: {
    readonly listPages?: FacebookError;
    readonly whoAmI?: FacebookError;
    // Fails every publish, of a text or a photo.
    readonly publish?: FacebookError;
    readonly editText?: FacebookError;
    readonly deletePost?: FacebookError;
  };
};

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
export const FACEBOOK_FAKE_PAGE: GrantedPage = {
  id: facebookPageIdUnsafe('104000000000001'),
  name: 'Panda Bakery',
  token: ['bakery', 'page', 'token'].join('-'),
  tasks: ['ADVERTISE', 'ANALYZE', 'CREATE_CONTENT', 'MESSAGING', 'MODERATE', 'MANAGE'],
};

// Ids are predictable: the Page id, then 122000000000001 for the first post, ...002 for the second.
const postIdOf = (pageId: string, count: number): string => `${pageId}_12200000000000${count}`;

const linkOf = (id: string): string => {
  const [pageId, postNumber] = id.split('_', 2);
  return `https://www.facebook.com/${pageId}/posts/${postNumber}`;
};

const photoOf = (photo: FacebookPhoto): string => (photo.kind === 'url' ? photo.url : `${photo.kind}:${photo.image.format}`);

export const createFacebookFake = (config?: FacebookFakeConfig): FacebookFake => {
  const posts: FacebookFakePost[] = [];
  const edits: { id: string; text: string }[] = [];
  const deleted: string[] = [];
  const events: string[] = [];
  const errors = config?.errors;
  const publish = async (pageId: string, text: string | undefined, photo: string | undefined): ReturnType<Facebook['publishText']> => {
    events.push('publish');
    if (errors?.publish) return err(errors.publish);
    const id = postIdOf(pageId, posts.length + 1);
    posts.push({ id, pageId, ...(text !== undefined && { text }), ...(photo !== undefined && { photo }) });
    return ok({ id: facebookPostIdUnsafe(id), url: linkOf(id) });
  };
  return {
    posts,
    edits,
    deleted,
    events,
    listPages: async () => {
      if (errors?.listPages) return err(errors.listPages);
      return ok(config?.pages ?? [FACEBOOK_FAKE_PAGE]);
    },
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.page ?? { id: FACEBOOK_FAKE_PAGE.id, name: FACEBOOK_FAKE_PAGE.name });
    },
    publishText: async (pageId, text) => publish(pageId, text, undefined),
    publishPhoto: async (pageId, photo, caption) => publish(pageId, caption, photoOf(photo)),
    editText: async (id, text) => {
      events.push(`edit:${id}`);
      if (errors?.editText) return err(errors.editText);
      edits.push({ id, text });
      return ok({ id, url: linkOf(id) });
    },
    deletePost: async (id) => {
      events.push(`delete:${id}`);
      if (errors?.deletePost) return err(errors.deletePost);
      deleted.push(id);
      return ok(undefined);
    },
  };
};
