import type { FacebookImageFormat } from '../domain/facebook-image.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import { parseFacebookPostId } from '../domain/facebook-post-id.ts';
import type { FacebookPostId } from '../domain/facebook-post-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { FacebookError, FacebookPhoto, FacebookPublishedPost } from '../use-cases/ports/facebook.ts';
import { request } from './facebook-http.ts';
import type { FacebookGraphConfig } from './facebook-http.ts';
import { stringField } from './json-body.ts';

// A 10 MB photo sent with the call takes longer than a text, as on X.
const UPLOAD_TIMEOUT_MS = 60_000;

const MIME_TYPES: Readonly<Record<FacebookImageFormat, string>> = { jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff' };
const EXTENSIONS: Readonly<Record<FacebookImageFormat, string>> = { jpeg: 'jpg', png: 'png', gif: 'gif', bmp: 'bmp', tiff: 'tiff' };

// D26: Meta's answer carries no link; the post id, `<page-id>_<post-id>`, gives it.
const linkOf = (id: FacebookPostId): string => {
  const underscore = id.indexOf('_');
  return `https://www.facebook.com/${id.slice(0, underscore)}/posts/${id.slice(underscore + 1)}`;
};

// The id goes into later URL paths (an edit, a delete), so it is checked here (rule 12).
const publishedFrom = (raw: string | undefined): Result<FacebookPublishedPost, FacebookError> => {
  const id = parseFacebookPostId(raw ?? '');
  if (!id.ok) return err({ kind: 'rejected', status: 200, message: `Meta answered a post id not shaped <page>_<post>: ${String(raw)}` });
  return ok({ id: id.value, url: linkOf(id.value) });
};

const confirmed = (answer: Readonly<Record<string, unknown>>, what: string): Result<void, FacebookError> =>
  answer['success'] === true ? ok(undefined) : err({ kind: 'rejected', status: 200, message: `Meta did not confirm ${what}.` });

export const publishText = async (config: FacebookGraphConfig, pageId: FacebookPageId, text: string): Promise<Result<FacebookPublishedPost, FacebookError>> => {
  const answer = await request(config, `/${pageId}/feed`, { method: 'POST', body: new URLSearchParams({ message: text }) });
  return answer.ok ? publishedFrom(stringField(answer.value, 'id')) : answer;
};

// A URL goes as a form field for Facebook to download; a file goes as multipart, under `source`.
const photoBody = (photo: FacebookPhoto, caption: string | undefined): URLSearchParams | FormData => {
  if (photo.kind === 'url') return new URLSearchParams({ url: photo.url, ...(caption !== undefined && { caption }) });
  const { bytes, format } = photo.image;
  const form = new FormData();
  form.append('source', new Blob([new Uint8Array(bytes)], { type: MIME_TYPES[format] }), `photo.${EXTENSIONS[format]}`);
  if (caption !== undefined) form.append('caption', caption);
  return form;
};

// The answer's post_id is the post; its id is the photo, which an edit or a delete does not take.
export const publishPhoto = async (
  config: FacebookGraphConfig,
  pageId: FacebookPageId,
  photo: FacebookPhoto,
  caption: string | undefined
): Promise<Result<FacebookPublishedPost, FacebookError>> => {
  const timeoutMs = photo.kind === 'upload' ? UPLOAD_TIMEOUT_MS : undefined;
  const answer = await request(config, `/${pageId}/photos`, { method: 'POST', body: photoBody(photo, caption) }, timeoutMs);
  return answer.ok ? publishedFrom(stringField(answer.value, 'post_id')) : answer;
};

export const editText = async (config: FacebookGraphConfig, id: FacebookPostId, text: string): Promise<Result<FacebookPublishedPost, FacebookError>> => {
  const answer = await request(config, `/${id}`, { method: 'POST', body: new URLSearchParams({ message: text }) });
  if (!answer.ok) return answer;
  const edited = confirmed(answer.value, `the edit of ${id}`);
  return edited.ok ? ok({ id, url: linkOf(id) }) : edited;
};

export const deletePost = async (config: FacebookGraphConfig, id: FacebookPostId): Promise<Result<void, FacebookError>> => {
  const answer = await request(config, `/${id}`, { method: 'DELETE' });
  return answer.ok ? confirmed(answer.value, `the delete of ${id}`) : answer;
};
