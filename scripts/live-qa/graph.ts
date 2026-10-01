import { parseJson, pick } from './answer.ts';

// The probes call Meta directly, as the adapters do: the token in the Authorization header,
// never in a URL (rule 27), and a deadline on every call (rule 29).
export type Reply = { readonly ok: boolean; readonly body: unknown };

export const call = async (url: string, token: string, method = 'GET', body?: URLSearchParams | FormData): Promise<Reply> => {
  const answer = await fetch(url, { method, body, headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  return { ok: answer.ok, body: parseJson(await answer.text()) };
};

// Meta's own words for a refused call.
export const refusal = (reply: Reply): string => String(pick(reply.body, 'error', 'message') ?? JSON.stringify(reply.body));

const CHECK_EVERY_MS = 3000;
const CHECKS = 20;

// A container read until it settles, every 3 seconds for a minute at most: FINISHED, or why
// not. A read right after the container is made may answer not found, so a refusal is final
// only on the last read.
export const settled = async (read: () => Promise<Reply>, field: string, reason: string): Promise<string> => {
  let last = 'no answer';
  for (let attempt = 0; attempt < CHECKS; attempt += 1) {
    await Bun.sleep(CHECK_EVERY_MS);
    const reply = await read();
    const state = pick(reply.body, field);
    if (state === 'FINISHED') return 'FINISHED';
    if (state === 'ERROR' || state === 'EXPIRED') return `${state}: ${String(pick(reply.body, reason))}`;
    last = reply.ok ? `still ${String(state)}` : `refused: ${refusal(reply)}`;
  }
  return `${last} after a minute`;
};

// A container made and read until it settles; never published, so Meta drops it within 24 hours (D45).
export const tryContainer = async (create: () => Promise<Reply>, read: (id: string) => Promise<Reply>, field: string, reason: string): Promise<string> => {
  const created = await create();
  const id = pick(created.body, 'id');
  if (typeof id !== 'string' || !created.ok) return `refused: ${refusal(created)}`;
  return settled(async () => read(id), field, reason);
};
