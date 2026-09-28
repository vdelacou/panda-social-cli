import type { ImageUrl } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { PublishedPost, Threads, ThreadsError } from '../use-cases/ports/threads.ts';
import { publishingLimits, refreshToken, whoAmI } from './threads-account.ts';
import { createAndPublish } from './threads-container.ts';
import { idFrom, request, stringField } from './threads-http.ts';
import type { ThreadsGraphConfig } from './threads-http.ts';

export { THREADS_GRAPH_BASE } from './threads-http.ts';
export type { ThreadsGraphConfig } from './threads-http.ts';

// The post already exists at this point: a failed permalink read is reported as
// a null url, never as a failure an agent would answer with a duplicate post.
const readPermalink = async (config: ThreadsGraphConfig, id: string): Promise<string | null> => {
  const answer = await request(config, `/${id}?fields=permalink`, { method: 'GET' });
  if (!answer.ok) return null;
  return stringField(answer.value, 'permalink') ?? null;
};

const withPermalink = async (config: ThreadsGraphConfig, id: Result<ThreadsPostId, ThreadsError>): Promise<Result<PublishedPost, ThreadsError>> => {
  if (!id.ok) return id;
  return ok({ id: id.value, url: await readPermalink(config, id.value) });
};

// A text post needs no container wait: auto_publish_text publishes it in one call.
const publishText = async (config: ThreadsGraphConfig, text: string): Promise<Result<PublishedPost, ThreadsError>> => {
  const created = await request(config, '/me/threads', { method: 'POST', body: new URLSearchParams({ media_type: 'TEXT', text, auto_publish_text: 'true' }) });
  return withPermalink(config, created.ok ? idFrom(created.value) : created);
};

const publishImage = async (config: ThreadsGraphConfig, imageUrl: ImageUrl, text: string | undefined): Promise<Result<PublishedPost, ThreadsError>> =>
  withPermalink(config, await createAndPublish(config, { media_type: 'IMAGE', image_url: imageUrl, ...(text !== undefined && { text }) }));

const deletePost = async (config: ThreadsGraphConfig, id: ThreadsPostId): Promise<Result<void, ThreadsError>> => {
  const answer = await request(config, `/${id}`, { method: 'DELETE' });
  if (!answer.ok) return answer;
  if (answer.value['success'] !== true) return err({ kind: 'rejected', status: 200, message: `Threads did not confirm the delete of ${id}` });
  return ok(undefined);
};

export const createThreadsGraph = (config: ThreadsGraphConfig): Threads => ({
  publishText: async (text) => publishText(config, text),
  publishImage: async (imageUrl, text) => publishImage(config, imageUrl, text),
  publishReply: async (replyTo, text) => createAndPublish(config, { media_type: 'TEXT', text, reply_to_id: replyTo }),
  deletePost: async (id) => deletePost(config, id),
  whoAmI: async () => whoAmI(config),
  refreshToken: async () => refreshToken(config),
  publishingLimits: async (userId) => publishingLimits(config, userId),
});
