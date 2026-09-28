import { Buffer } from 'node:buffer';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XImage } from '../domain/x-image.ts';
import type { XKeys } from '../domain/x-keys.ts';
import { parseXPostId } from '../domain/x-post-id.ts';
import type { XPostId } from '../domain/x-post-id.ts';
import type { X, XAccount, XError, XPostDraft, XPublishedPost } from '../use-cases/ports/x.ts';
import { request } from './x-http.ts';
import type { XHttpConfig } from './x-http.ts';
import { recordField, stringField } from './x-json.ts';
import { createXSigner } from './x-signer.ts';

export { X_API_BASE } from './x-http.ts';

// A 5 MB image travels as about 7 MB of base64, so an upload gets longer than a post.
const UPLOAD_TIMEOUT_MS = 60_000;

export type XApiConfig = {
  readonly keys: XKeys;
  readonly timeoutMs?: number;
};

const whoAmI = async (config: XHttpConfig): Promise<Result<XAccount, XError>> => {
  const answer = await request(config, { method: 'GET', path: '/2/users/me' });
  if (!answer.ok) return answer;
  const data = recordField(answer.value.body, 'data');
  const userId = stringField(data, 'id');
  const username = stringField(data, 'username');
  if (userId === undefined || username === undefined) return err({ kind: 'rejected', status: 200, message: 'X answered /2/users/me without an id or a username' });
  // X states the keys' level in this header, which docs.x.com does not list (2026-09-28): null without it.
  return ok({ userId, username, accessLevel: answer.value.headers.get('x-access-level') });
};

// The text is always sent, empty beside an image; each option only when it is set.
const postBody = (draft: XPostDraft): Readonly<Record<string, unknown>> => ({
  text: draft.text,
  ...(draft.mediaIds && { media: { media_ids: draft.mediaIds } }),
  ...(draft.replyTo && { reply: { in_reply_to_tweet_id: draft.replyTo } }),
  ...(draft.editOf && { edit_options: { previous_post_id: draft.editOf } }),
});

const createPost = async (config: XHttpConfig, draft: XPostDraft): Promise<Result<XPublishedPost, XError>> => {
  const answer = await request(config, { method: 'POST', path: '/2/tweets', json: postBody(draft) });
  if (!answer.ok) return answer;
  const id = parseXPostId(stringField(recordField(answer.value.body, 'data'), 'id') ?? '');
  if (!id.ok) return err({ kind: 'rejected', status: 201, message: 'X answered /2/tweets without a post id.' });
  // D17: X's answer carries no link, and this one leads to the post whatever the account is called.
  return ok({ id: id.value, url: `https://x.com/i/status/${id.value}` });
};

const uploadImage = async (config: XHttpConfig, image: XImage): Promise<Result<string, XError>> => {
  const json = { media: Buffer.from(image.bytes).toString('base64'), media_category: 'tweet_image' };
  const answer = await request(config, { method: 'POST', path: '/2/media/upload', json, timeoutMs: UPLOAD_TIMEOUT_MS });
  if (!answer.ok) return answer;
  const mediaId = stringField(recordField(answer.value.body, 'data'), 'id');
  if (mediaId === undefined) return err({ kind: 'rejected', status: 200, message: 'X answered /2/media/upload without a media id.' });
  return ok(mediaId);
};

const deletePost = async (config: XHttpConfig, id: XPostId): Promise<Result<void, XError>> => {
  const answer = await request(config, { method: 'DELETE', path: `/2/tweets/${id}` });
  if (!answer.ok) return answer;
  if (recordField(answer.value.body, 'data')['deleted'] !== true) return err({ kind: 'rejected', status: 200, message: `X did not delete post ${id}.` });
  return ok(undefined);
};

export const createXApi = (config: XApiConfig): X => {
  const http: XHttpConfig = { sign: createXSigner(config.keys), ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }) };
  return {
    whoAmI: async () => whoAmI(http),
    uploadImage: async (image) => uploadImage(http, image),
    createPost: async (draft) => createPost(http, draft),
    deletePost: async (id) => deletePost(http, id),
  };
};
