import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsUserId } from '../domain/threads-user-id.ts';
import type { ThreadsAccount, ThreadsError } from '../use-cases/ports/threads.ts';
import { request, stringField } from './threads-http.ts';
import type { ThreadsGraphConfig } from './threads-http.ts';

const unexpected = (what: string): ThreadsError => ({ kind: 'rejected', status: 200, message: `Threads answered ${what}` });

// The id is branded here, before it can reach a URL path (rule 12).
export const whoAmI = async (config: ThreadsGraphConfig): Promise<Result<ThreadsAccount, ThreadsError>> => {
  const answer = await request(config, '/me?fields=id,username', { method: 'GET' });
  if (!answer.ok) return answer;
  const userId = parseThreadsUserId(stringField(answer.value, 'id') ?? '');
  const username = stringField(answer.value, 'username');
  if (username === undefined || !userId.ok) return err(unexpected('/me without a numeric id or a username'));
  return ok({ userId: userId.value, username });
};
