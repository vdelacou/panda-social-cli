import { pick } from './answer.ts';
import type { Answer } from './answer.ts';
import { check, said } from './report.ts';
import type { Check } from './report.ts';
import type { Session } from './session.ts';

// The posts a run made, to delete at the end, and their links, to open before that. The links
// go to the terminal only: the report carries ids, never a profile address.
export type Made = { readonly ids: string[]; readonly links: string[] };

export const nothingMade = (): Made => ({ ids: [], links: [] });

const repliesOf = (answer: Answer): ReadonlyArray<string> => {
  const replies = answer.ok ? answer.data['replies'] : undefined;
  return Array.isArray(replies) ? replies.map(String) : [];
};

const postDetail = (id: string, replies: number, url: unknown): string =>
  [`id ${id}`, ...(replies > 0 ? [`${replies} replies`] : []), typeof url === 'string' ? 'link returned' : 'no link'].join(', ');

// A post command: its check, and what it made added to `made`. Answers the new post's id too.
export const postAndKeep = (session: Session, name: string, args: ReadonlyArray<string>, made: Made): { readonly check: Check; readonly id?: string } => {
  const answer = session.run(['post', ...args]);
  if (!answer.ok) return { check: check(name, 'fail', said(answer)) };
  const id = String(answer.data['id']);
  const url = pick(answer.data, 'url');
  made.ids.push(id, ...repliesOf(answer));
  if (typeof url === 'string') made.links.push(url);
  return { check: check(name, 'pass', postDetail(id, repliesOf(answer).length, url)), id };
};

// On a terminal, a pause to open the new posts logged out (D43), then every post the run made goes.
export const deleteMade = (session: Session, platform: string, made: Made): ReadonlyArray<Check> => {
  if (session.interactive && made.links.length > 0) {
    console.error(['Open these in a private window, to see what a logged-out visitor sees:', ...made.links].join('\n'));
    prompt('Then press Enter to delete the posts.');
  }
  return made.ids.map((id) => {
    const answer = session.run(['delete', '--on', platform, '--id', id]);
    return check(`delete ${id}`, answer.ok ? 'pass' : 'fail', answer.ok ? 'deleted' : said(answer));
  });
};
