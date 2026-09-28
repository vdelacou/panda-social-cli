import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { ThreadsError } from '../use-cases/ports/threads.ts';
import { idFrom, request, stringField } from './threads-http.ts';
import type { ThreadsGraphConfig } from './threads-http.ts';

// Meta processes a media container asynchronously and a brand-new container id is not
// readable at once; these waits are the ones panda-social-agent runs in production,
// with the total raised to 60 s for images (Meta says 30 s on average).
const FIRST_CHECK_AFTER_MS = 500;
const CHECK_EVERY_MS = 1500;
const DEFAULT_CHECKS = 40;

// Code 24 with subcode 4279009 on a status read: the new container is not visible yet.
const NOT_VISIBLE_YET = /"error_subcode":\s*4279009\b|"code":\s*24\b/;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type ContainerState = { readonly kind: 'finished' } | { readonly kind: 'pending' } | { readonly kind: 'failed'; readonly message: string };

const readContainer = async (config: ThreadsGraphConfig, id: string): Promise<Result<ContainerState, ThreadsError>> => {
  const answer = await request(config, `/${id}?fields=status,error_message`, { method: 'GET' });
  if (!answer.ok) return answer.error.kind === 'rejected' && NOT_VISIBLE_YET.test(answer.error.message) ? ok({ kind: 'pending' }) : answer;
  const status = stringField(answer.value, 'status');
  if (status === 'FINISHED') return ok({ kind: 'finished' });
  if (status === 'ERROR' || status === 'EXPIRED')
    return ok({ kind: 'failed', message: `container ${id} ended in ${status}: ${stringField(answer.value, 'error_message') ?? 'no message'}` });
  return ok({ kind: 'pending' });
};

// Bounded: a container that never finishes cannot hang the CLI (rule 29).
const waitUntilFinished = async (config: ThreadsGraphConfig, id: string): Promise<Result<void, ThreadsError>> => {
  const sleep = config.sleep ?? wait;
  const checks = config.pollAttempts ?? DEFAULT_CHECKS;
  await sleep(FIRST_CHECK_AFTER_MS);
  for (let check = 1; check <= checks; check += 1) {
    const state = await readContainer(config, id);
    if (!state.ok) return state;
    if (state.value.kind === 'finished') return ok(undefined);
    if (state.value.kind === 'failed') return err({ kind: 'rejected', status: 0, message: state.value.message });
    if (check < checks) await sleep(CHECK_EVERY_MS);
  }
  return err({ kind: 'still-processing', message: `container ${id} was still processing after ${checks} checks` });
};

// Create a container, wait until Meta has processed it, then publish it.
export const createAndPublish = async (config: ThreadsGraphConfig, params: Readonly<Record<string, string>>): Promise<Result<ThreadsPostId, ThreadsError>> => {
  const created = await request(config, '/me/threads', { method: 'POST', body: new URLSearchParams(params) });
  if (!created.ok) return created;
  const container = idFrom(created.value);
  if (!container.ok) return container;
  const ready = await waitUntilFinished(config, container.value);
  if (!ready.ok) return ready;
  const published = await request(config, '/me/threads_publish', { method: 'POST', body: new URLSearchParams({ creation_id: container.value }) });
  return published.ok ? idFrom(published.value) : published;
};
