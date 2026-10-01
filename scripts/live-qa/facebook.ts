import { pick } from './answer.ts';
import { deleteMade, nothingMade, postAndKeep } from './posting.ts';
import type { Made } from './posting.ts';
import { check, said, statusCheck } from './report.ts';
import type { Check, Findings } from './report.ts';
import { textOf } from './session.ts';
import type { Session } from './session.ts';

// D29: the same text twice in a row, which Meta's old error list calls code 506.
const duplicateCheck = (session: Session, text: string, made: Made): Check => {
  const again = session.run(['post', '--to', 'facebook', '--text', text]);
  if (!again.ok) return check('post the same text again', again.code === 'duplicate-text' ? 'pass' : 'fail', said(again));
  made.ids.push(String(again.data['id']));
  return check('post the same text again', 'note', 'Facebook took the repeat: code 506 never came');
};

// D27: the Page's own post edits in place, keeping its id.
const editCheck = (session: Session, id: string): Check => {
  const edited = session.run(['update', '--on', 'facebook', '--id', id, '--text', textOf(session, 'an edit')]);
  if (!edited.ok) return check('edit the text', 'fail', said(edited));
  return check('edit the text', pick(edited.data, 'edited') === id ? 'pass' : 'fail', `id ${String(edited.data['id'])}, edited ${String(pick(edited.data, 'edited'))}`);
};

// D43: a text and its repeat, a photo by URL and a photo file, an edit, then every post deleted.
const publishChecks = (session: Session): ReadonlyArray<Check> => {
  const made = nothingMade();
  const words = textOf(session, 'a text');
  const text = postAndKeep(session, 'post a text', ['--to', 'facebook', '--text', words], made);
  const repeat = text.id === undefined ? [] : [duplicateCheck(session, words, made)];
  const byUrl = session.image === undefined ? [] : [['post a photo by URL', session.image] as const];
  const byFile = session.imageFile === undefined ? [] : [['upload a photo file', session.imageFile] as const];
  const photos = [...byUrl, ...byFile].map(([name, image]) => postAndKeep(session, name, ['--to', 'facebook', '--image', image, '--text', textOf(session, name)], made).check);
  const edit = text.id === undefined ? [] : [editCheck(session, text.id)];
  return [text.check, ...repeat, ...photos, ...edit, ...deleteMade(session, 'facebook', made)];
};

export const facebookQa = async (session: Session): Promise<Findings> => {
  const status = statusCheck('facebook', session.run(['status', 'facebook']), (data) => `Page token from ${String(pick(data, 'token', 'source'))}`);
  if (status.outcome === 'fail') return { checks: [status], byHand: [] };
  const renewal = session.renewal ? [check('renew the token', 'note', 'a Page token made from a long-lived user token never expires (D21)')] : [];
  const checks = [status, ...(session.publish ? publishChecks(session) : []), ...renewal];
  // The pause to open the posts logged out happens on a terminal only.
  const visibility = session.interactive
    ? 'Say whether the private window showed the posts: an app in development shows them only to its own roles until it is published.'
    : 'Run it in a terminal for a pause to open the posts logged out before they are deleted.';
  return { checks, byHand: [session.publish ? visibility : 'Run again with --publish to post and delete the test posts.'] };
};
