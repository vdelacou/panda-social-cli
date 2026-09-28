import type { ImageUrl } from '../domain/image-url.ts';
import { parseInstagramMediaId } from '../domain/instagram-media-id.ts';
import type { InstagramMediaId } from '../domain/instagram-media-id.ts';
import type { InstagramUserId } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { InstagramError, InstagramPublishedPost } from '../use-cases/ports/instagram.ts';
import { request } from './instagram-http.ts';
import type { InstagramGraphConfig } from './instagram-http.ts';
import { stringField } from './json-body.ts';

type Body = Readonly<Record<string, unknown>>;

// D35: the waits of the Threads container, a first check after 0.5 s, then one every 1.5 s,
// 40 checks (60 s) at most. Meta checks a video container once a minute; an image takes seconds.
const FIRST_CHECK_AFTER_MS = 500;
const CHECK_EVERY_MS = 1500;
const DEFAULT_CHECKS = 40;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Ids Instagram hands back go into the next URL path, so they are checked here (rule 12).
const idFrom = (body: Body, what: string): Result<InstagramMediaId, InstagramError> => {
  const raw = stringField(body, 'id');
  const id = parseInstagramMediaId(raw ?? '');
  return id.ok ? id : err({ kind: 'rejected', status: 200, message: `Instagram answered ${what} without a numeric id: ${String(raw)}` });
};

type ContainerState = { readonly kind: 'finished' } | { readonly kind: 'pending' } | { readonly kind: 'failed'; readonly error: InstagramError };

const ended = (id: string, code: string, status: string | undefined): string => {
  const reason = status === undefined ? '' : `: ${status}`;
  return `container ${id} ended in ${code}${reason}`;
};

// ERROR is an image Instagram could not use; EXPIRED a container left unpublished for 24 hours.
const stateOf = (id: string, body: Body): ContainerState => {
  const code = stringField(body, 'status_code');
  if (code === 'FINISHED') return { kind: 'finished' };
  if (code === 'ERROR') return { kind: 'failed', error: { kind: 'image-rejected', message: ended(id, code, stringField(body, 'status')) } };
  if (code === 'EXPIRED') return { kind: 'failed', error: { kind: 'rejected', status: 0, message: ended(id, code, stringField(body, 'status')) } };
  return { kind: 'pending' };
};

const readContainer = async (config: InstagramGraphConfig, id: InstagramMediaId): Promise<Result<ContainerState, InstagramError>> => {
  const answer = await request(config, `/${id}?fields=status_code,status`, { method: 'GET' });
  return answer.ok ? ok(stateOf(id, answer.value)) : answer;
};

// Bounded: a container that never finishes cannot hang the CLI (rule 29).
const waitUntilFinished = async (config: InstagramGraphConfig, id: InstagramMediaId): Promise<Result<void, InstagramError>> => {
  const sleep = config.sleep ?? wait;
  const checks = config.pollAttempts ?? DEFAULT_CHECKS;
  await sleep(FIRST_CHECK_AFTER_MS);
  for (let check = 1; check <= checks; check += 1) {
    const state = await readContainer(config, id);
    if (!state.ok) return state;
    if (state.value.kind === 'finished') return ok(undefined);
    if (state.value.kind === 'failed') return err(state.value.error);
    if (check < checks) await sleep(CHECK_EVERY_MS);
  }
  return err({ kind: 'still-processing', message: `container ${id} was still processing after ${checks} checks` });
};

const createContainer = async (
  config: InstagramGraphConfig,
  userId: InstagramUserId,
  imageUrl: ImageUrl,
  caption: string | undefined
): Promise<Result<InstagramMediaId, InstagramError>> => {
  const created = await request(config, `/${userId}/media`, { method: 'POST', body: new URLSearchParams({ image_url: imageUrl, ...(caption !== undefined && { caption }) }) });
  return created.ok ? idFrom(created.value, 'the container') : created;
};

// The post already exists at this point: a failed permalink read is a null url, never a
// failure an agent would answer with a duplicate post.
const readPermalink = async (config: InstagramGraphConfig, id: InstagramMediaId): Promise<string | null> => {
  const answer = await request(config, `/${id}?fields=permalink`, { method: 'GET' });
  if (!answer.ok) return null;
  return stringField(answer.value, 'permalink') ?? null;
};

const publishContainer = async (config: InstagramGraphConfig, userId: InstagramUserId, container: InstagramMediaId): Promise<Result<InstagramPublishedPost, InstagramError>> => {
  const published = await request(config, `/${userId}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: container }) });
  const media = published.ok ? idFrom(published.value, 'the publish') : published;
  if (!media.ok) return media;
  return ok({ id: media.value, url: await readPermalink(config, media.value) });
};

// D35: create the container, wait until Instagram has processed it, publish it, read its link.
export const publishImage = async (
  config: InstagramGraphConfig,
  userId: InstagramUserId,
  imageUrl: ImageUrl,
  caption: string | undefined
): Promise<Result<InstagramPublishedPost, InstagramError>> => {
  const container = await createContainer(config, userId, imageUrl, caption);
  if (!container.ok) return container;
  const ready = await waitUntilFinished(config, container.value);
  return ready.ok ? publishContainer(config, userId, container.value) : ready;
};
