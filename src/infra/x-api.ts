import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XKeys } from '../domain/x-keys.ts';
import type { X, XAccount, XError } from '../use-cases/ports/x.ts';
import { request } from './x-http.ts';
import type { XHttpConfig } from './x-http.ts';
import { recordField, stringField } from './x-json.ts';
import { createXSigner } from './x-signer.ts';

export { X_API_BASE } from './x-http.ts';

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

export const createXApi = (config: XApiConfig): X => {
  const http: XHttpConfig = { sign: createXSigner(config.keys), ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }) };
  return { whoAmI: async () => whoAmI(http) };
};
