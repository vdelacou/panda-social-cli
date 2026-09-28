import { parseFacebookPageId } from '../domain/facebook-page.ts';
import type { GrantedPage } from '../domain/facebook-page.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Facebook, FacebookError, FacebookPage } from '../use-cases/ports/facebook.ts';
import { request } from './facebook-http.ts';
import type { FacebookGraphConfig } from './facebook-http.ts';
import { deletePost, editText, publishPhoto, publishText } from './facebook-posts.ts';
import { isRecord, stringField } from './json-body.ts';

export { FACEBOOK_GRAPH_BASE } from './facebook-http.ts';
export type { FacebookGraphConfig } from './facebook-http.ts';

const unexpected = (what: string): FacebookError => ({ kind: 'rejected', status: 200, message: `Meta answered ${what}` });

const tasksOf = (value: unknown): ReadonlyArray<string> | null => (Array.isArray(value) ? value.filter((task): task is string => typeof task === 'string') : null);

// The id goes into URL paths and the token into later calls, so an entry lacking either
// is not a Page this CLI can use.
const grantedPage = (entry: unknown): GrantedPage | undefined => {
  if (!isRecord(entry)) return undefined;
  const id = parseFacebookPageId(stringField(entry, 'id') ?? '');
  const name = stringField(entry, 'name');
  const token = stringField(entry, 'access_token');
  if (name === undefined || !token || !id.ok) return undefined;
  return { id: id.value, name, token, tasks: tasksOf(entry['tasks']) };
};

const isGranted = (page: GrantedPage | undefined): page is GrantedPage => page !== undefined;

// One page of up to 100 Pages, more than a person manages by hand.
const listPages = async (config: FacebookGraphConfig): Promise<Result<ReadonlyArray<GrantedPage>, FacebookError>> => {
  const answer = await request(config, '/me/accounts?fields=id,name,access_token,tasks&limit=100', { method: 'GET' });
  if (!answer.ok) return answer;
  const data = answer.value['data'];
  const pages = Array.isArray(data) ? data.map((entry) => grantedPage(entry)) : [undefined];
  return pages.every(isGranted) ? ok(pages) : err(unexpected('a Page without a numeric id, a name or a token'));
};

// With a Page token, /me is the Page itself.
const whoAmI = async (config: FacebookGraphConfig): Promise<Result<FacebookPage, FacebookError>> => {
  const answer = await request(config, '/me?fields=id,name', { method: 'GET' });
  if (!answer.ok) return answer;
  const id = parseFacebookPageId(stringField(answer.value, 'id') ?? '');
  const name = stringField(answer.value, 'name');
  if (name === undefined || !id.ok) return err(unexpected('/me without a numeric id or a name'));
  return ok({ id: id.value, name });
};

export const createFacebookGraph = (config: FacebookGraphConfig): Facebook => ({
  listPages: async () => listPages(config),
  whoAmI: async () => whoAmI(config),
  publishText: async (pageId, text) => publishText(config, pageId, text),
  publishPhoto: async (pageId, photo, caption) => publishPhoto(config, pageId, photo, caption),
  editText: async (id, text) => editText(config, id, text),
  deletePost: async (id) => deletePost(config, id),
});
