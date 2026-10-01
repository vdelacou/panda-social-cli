import { FACEBOOK_GRAPH_BASE } from '../../src/index.ts';
import { pick } from './answer.ts';
import type { Page } from './credentials.ts';
import { call, refusal, tryContainer } from './graph.ts';
import { connectedPage } from './probe-checks.ts';
import { check } from './report.ts';
import type { Check, Findings } from './report.ts';
import type { Session } from './session.ts';

// Under Facebook Login a container is made on graph.facebook.com, for the account linked to the Page.
const containerCheck = async (page: Page, accountId: string, image: string): Promise<Check> => {
  const create = async (): ReturnType<typeof call> => call(`${FACEBOOK_GRAPH_BASE}/${accountId}/media`, page.token, 'POST', new URLSearchParams({ image_url: image }));
  const read = async (id: string): ReturnType<typeof call> => call(`${FACEBOOK_GRAPH_BASE}/${id}?fields=status_code,status`, page.token);
  const state = await tryContainer(create, read, 'status_code', 'status');
  return check('the Page token makes an Instagram container', 'note', state === 'FINISHED' ? 'yes: it finished, and was never published' : `no: ${state}`);
};

// 5.3's question: does the never-expiring Page token reach the Instagram account linked to the Page?
export const pageInstagramProbe = async (session: Session): Promise<Findings> => {
  const page = await connectedPage(session);
  if (!('token' in page)) return { checks: [page], byHand: [] };
  const linked = await call(`${FACEBOOK_GRAPH_BASE}/${page.pageId}?fields=instagram_business_account`, page.token);
  const accountId = pick(linked.body, 'instagram_business_account', 'id');
  if (typeof accountId !== 'string') {
    return { checks: [check('an Instagram account is linked to the Page', 'note', linked.ok ? 'no linked account' : `no: ${refusal(linked)}`)], byHand: [] };
  }
  const read = await call(`${FACEBOOK_GRAPH_BASE}/${accountId}?fields=username`, page.token);
  const checks = [
    check('an Instagram account is linked to the Page', 'pass', 'yes'),
    check('the Page token reads that account', 'note', read.ok ? 'yes' : `no: ${refusal(read)}`),
    ...(session.image === undefined ? [] : [await containerCheck(page, accountId, session.image)]),
  ];
  return { checks, byHand: session.image === undefined ? ['Run again with --image to see whether the Page token can make a container too.'] : [] };
};
