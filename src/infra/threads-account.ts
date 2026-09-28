import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsUserId } from '../domain/threads-user-id.ts';
import type { ThreadsUserId } from '../domain/threads-user-id.ts';
import type { PublishingLimits, Quota, RefreshedToken, ThreadsAccount, ThreadsError } from '../use-cases/ports/threads.ts';
import { request, stringField, THREADS_GRAPH_HOST } from './threads-http.ts';
import type { ThreadsGraphConfig } from './threads-http.ts';

type Body = Readonly<Record<string, unknown>>;

const unexpected = (what: string): ThreadsError => ({ kind: 'rejected', status: 200, message: `Threads answered ${what}` });

const isRecord = (value: unknown): value is Body => typeof value === 'object' && value !== null && !Array.isArray(value);

// The id goes into the publishing-limit URL, so it is checked here (rule 12).
export const whoAmI = async (config: ThreadsGraphConfig): Promise<Result<ThreadsAccount, ThreadsError>> => {
  const answer = await request(config, '/me?fields=id,username', { method: 'GET' });
  if (!answer.ok) return answer;
  const userId = parseThreadsUserId(stringField(answer.value, 'id') ?? '');
  const username = stringField(answer.value, 'username');
  if (username === undefined || !userId.ok) return err(unexpected('/me without a numeric id or a username'));
  return ok({ userId: userId.value, username });
};

// Unversioned, at the host root, as Meta documents it. The token rides in the header like
// every call, never in the URL: Threads reads it there (probed 2026-09-28).
export const refreshToken = async (config: ThreadsGraphConfig): Promise<Result<RefreshedToken, ThreadsError>> => {
  const answer = await request(config, '/refresh_access_token?grant_type=th_refresh_token', { method: 'GET' }, THREADS_GRAPH_HOST);
  if (!answer.ok) return answer;
  const token = stringField(answer.value, 'access_token');
  const expiresIn = answer.value['expires_in'];
  if (token === undefined || token === '' || typeof expiresIn !== 'number') return err(unexpected('the token refresh without a token or its lifetime'));
  return ok({ token, expiresInSeconds: expiresIn });
};

const quota = (entry: Body, usage: string, settings: string): Quota | undefined => {
  const used = entry[usage];
  const config = entry[settings];
  if (typeof used !== 'number' || !isRecord(config)) return undefined;
  const total = config['quota_total'];
  const windowSeconds = config['quota_duration'];
  if (typeof total !== 'number' || typeof windowSeconds !== 'number') return undefined;
  return { used, total, windowSeconds };
};

const limitsFrom = (body: Body): PublishingLimits | undefined => {
  const data = body['data'];
  const entry: unknown = Array.isArray(data) ? data[0] : undefined;
  if (!isRecord(entry)) return undefined;
  const posts = quota(entry, 'quota_usage', 'config');
  const replies = quota(entry, 'reply_quota_usage', 'reply_config');
  const deletes = quota(entry, 'delete_quota_usage', 'delete_config');
  return posts && replies && deletes ? { posts, replies, deletes } : undefined;
};

const LIMIT_FIELDS = 'quota_usage,config,reply_quota_usage,reply_config,delete_quota_usage,delete_config';

export const publishingLimits = async (config: ThreadsGraphConfig, userId: ThreadsUserId): Promise<Result<PublishingLimits, ThreadsError>> => {
  const answer = await request(config, `/${userId}/threads_publishing_limit?fields=${LIMIT_FIELDS}`, { method: 'GET' });
  if (!answer.ok) return answer;
  const limits = limitsFrom(answer.value);
  return limits ? ok(limits) : err(unexpected('the publishing limit without its three quotas'));
};
