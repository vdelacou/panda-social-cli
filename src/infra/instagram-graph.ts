import { parseInstagramUserId } from '../domain/instagram-user-id.ts';
import type { InstagramUserId } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Instagram, InstagramAccount, InstagramError, Quota, RefreshedToken } from '../use-cases/ports/instagram.ts';
import { INSTAGRAM_GRAPH_HOST, request } from './instagram-http.ts';
import type { InstagramGraphConfig } from './instagram-http.ts';
import { isRecord, recordField, stringField } from './json-body.ts';

export { INSTAGRAM_GRAPH_BASE } from './instagram-http.ts';
export type { InstagramGraphConfig } from './instagram-http.ts';

type Body = Readonly<Record<string, unknown>>;

const unexpected = (what: string): InstagramError => ({ kind: 'rejected', status: 200, message: `Instagram answered ${what}` });

// The first entry of `data`, or the body itself when it has none: Meta's get-started sample
// wraps /me in `data` where a node answers flat (D31), so either is read.
const firstEntry = (body: Body): Body => {
  const data = body['data'];
  const entry: unknown = Array.isArray(data) ? data[0] : body;
  return isRecord(entry) ? entry : {};
};

// `user_id` is the professional account id that publishing and the quota take; `id` is only
// app-scoped. It goes into URL paths, so it is checked here (rule 12).
const whoAmI = async (config: InstagramGraphConfig): Promise<Result<InstagramAccount, InstagramError>> => {
  const answer = await request(config, '/me?fields=user_id,username', { method: 'GET' });
  if (!answer.ok) return answer;
  const account = firstEntry(answer.value);
  const userId = parseInstagramUserId(stringField(account, 'user_id') ?? '');
  const username = stringField(account, 'username');
  if (username === undefined || !userId.ok) return err(unexpected('/me without a numeric user_id or a username'));
  return ok({ userId: userId.value, username });
};

// Unversioned, at the host root, as Meta documents it; the token rides in the header (D31).
const refreshToken = async (config: InstagramGraphConfig): Promise<Result<RefreshedToken, InstagramError>> => {
  const answer = await request(config, '/refresh_access_token?grant_type=ig_refresh_token', { method: 'GET' }, INSTAGRAM_GRAPH_HOST);
  if (!answer.ok) return answer;
  const token = stringField(answer.value, 'access_token');
  const expiresIn = answer.value['expires_in'];
  if (!token || typeof expiresIn !== 'number') return err(unexpected('the token refresh without a token or its lifetime'));
  return ok({ token, expiresInSeconds: expiresIn });
};

const quotaFrom = (entry: Body): Quota | undefined => {
  const used = entry['quota_usage'];
  const settings = recordField(entry, 'config');
  const total = settings['quota_total'];
  const windowSeconds = settings['quota_duration'];
  if (typeof used !== 'number' || typeof total !== 'number' || typeof windowSeconds !== 'number') return undefined;
  return { used, total, windowSeconds };
};

// D33: the account's own quota, since Meta's pages give 50 and 100.
const publishingLimit = async (config: InstagramGraphConfig, userId: InstagramUserId): Promise<Result<Quota, InstagramError>> => {
  const answer = await request(config, `/${userId}/content_publishing_limit?fields=quota_usage,config`, { method: 'GET' });
  if (!answer.ok) return answer;
  const quota = quotaFrom(firstEntry(answer.value));
  return quota ? ok(quota) : err(unexpected('the publishing limit without its usage, total and window'));
};

export const createInstagramGraph = (config: InstagramGraphConfig): Instagram => ({
  whoAmI: async () => whoAmI(config),
  refreshToken: async () => refreshToken(config),
  publishingLimit: async (userId) => publishingLimit(config, userId),
});
