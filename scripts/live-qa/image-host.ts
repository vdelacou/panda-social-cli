import path from 'node:path';
import { FACEBOOK_GRAPH_BASE, INSTAGRAM_GRAPH_BASE, THREADS_GRAPH_BASE } from '../../src/index.ts';
import { pick } from './answer.ts';
import { tokenOf } from './credentials.ts';
import type { Page } from './credentials.ts';
import { call, refusal, tryContainer } from './graph.ts';
import { connectedPage, notTried } from './probe-checks.ts';
import { check } from './report.ts';
import type { Check, Findings } from './report.ts';
import type { Session } from './session.ts';

type Hosted = { readonly photoId: string; readonly url?: string; readonly problem?: string };

// D3, D45: the Page keeps the image as an unpublished photo for about 24 hours. The file goes up
// as the Facebook adapter sends one, a typed part named photo.<extension>, so a refusal is Meta's
// answer to the question and not to a different upload.
const hostOnPage = async (page: Page, file: string): Promise<Hosted | string> => {
  const image = Bun.file(file);
  const form = new FormData();
  form.append('source', new Blob([await image.arrayBuffer()], { type: image.type }), `photo${path.extname(file)}`);
  form.append('published', 'false');
  form.append('temporary', 'true');
  const uploaded = await call(`${FACEBOOK_GRAPH_BASE}/${page.pageId}/photos`, page.token, 'POST', form);
  const photoId = pick(uploaded.body, 'id');
  if (typeof photoId !== 'string' || !uploaded.ok) return refusal(uploaded);
  const read = await call(`${FACEBOOK_GRAPH_BASE}/${photoId}?fields=images`, page.token);
  const url = pick(read.body, 'images', '0', 'source');
  return typeof url === 'string' ? { photoId, url } : { photoId, problem: refusal(read) };
};

const verdict = (name: string, state: string): Check => check(name, 'note', state === 'FINISHED' ? 'yes: its container finished, and was never published' : `no: ${state}`);

const THREADS_TRIAL = 'Threads takes the Facebook URL';
const INSTAGRAM_TRIAL = 'Instagram takes the Facebook URL';

// The CLI's status proves the token first: a broken one fails the run, a missing one skips the trial.
const tryThreads = async (session: Session, url: string): Promise<Check> => {
  const status = session.run(['status', 'threads']);
  const bearer = await tokenOf(session.profile, 'threads');
  if (bearer === undefined || !status.ok) return notTried(THREADS_TRIAL, status);
  const create = async (): ReturnType<typeof call> => call(`${THREADS_GRAPH_BASE}/me/threads`, bearer, 'POST', new URLSearchParams({ media_type: 'IMAGE', image_url: url }));
  const read = async (id: string): ReturnType<typeof call> => call(`${THREADS_GRAPH_BASE}/${id}?fields=status,error_message`, bearer);
  return verdict(THREADS_TRIAL, await tryContainer(create, read, 'status', 'error_message'));
};

const tryInstagram = async (session: Session, url: string): Promise<Check> => {
  const status = session.run(['status', 'instagram']);
  const bearer = await tokenOf(session.profile, 'instagram');
  const userId = pick(status, 'data', 'account', 'userId');
  if (bearer === undefined || typeof userId !== 'string' || !status.ok) return notTried(INSTAGRAM_TRIAL, status);
  const create = async (): ReturnType<typeof call> => call(`${INSTAGRAM_GRAPH_BASE}/${userId}/media`, bearer, 'POST', new URLSearchParams({ image_url: url }));
  const read = async (id: string): ReturnType<typeof call> => call(`${INSTAGRAM_GRAPH_BASE}/${id}?fields=status_code,status`, bearer);
  return verdict(INSTAGRAM_TRIAL, await tryContainer(create, read, 'status_code', 'status'));
};

const trials = async (session: Session, hosted: Hosted): Promise<ReadonlyArray<Check>> =>
  hosted.url === undefined
    ? [check('read the photo URL', 'fail', hosted.problem ?? 'no URL')]
    : [check('read the photo URL', 'pass', `served from ${new URL(hosted.url).host}`), await tryThreads(session, hosted.url), await tryInstagram(session, hosted.url)];

// 4.3's question: will Threads and Instagram download an image the Page hosts unpublished?
export const imageHostProbe = async (session: Session): Promise<Findings> => {
  if (session.imageFile === undefined) return { checks: [check('image-host', 'fail', 'needs --image, a public https URL to a JPEG')], byHand: [] };
  const page = await connectedPage(session);
  if (!('token' in page)) return { checks: [page], byHand: [] };
  const hosted = await hostOnPage(page, session.imageFile);
  if (typeof hosted === 'string') return { checks: [check('the Page hosts the image', 'note', `no: ${hosted}`)], byHand: [] };
  const checks = await trials(session, hosted);
  const deleted = await call(`${FACEBOOK_GRAPH_BASE}/${hosted.photoId}`, page.token, 'DELETE');
  const cleanup = check('delete the photo', deleted.ok ? 'pass' : 'fail', deleted.ok ? 'deleted' : refusal(deleted));
  return { checks: [check('the Page hosts the image', 'pass', 'unpublished, temporary'), ...checks, cleanup], byHand: [] };
};
