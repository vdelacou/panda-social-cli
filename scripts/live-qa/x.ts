import { pick } from './answer.ts';
import { deleteMade, nothingMade, postAndKeep } from './posting.ts';
import { check, said, statusCheck } from './report.ts';
import type { Check, Findings } from './report.ts';
import { textOf } from './session.ts';
import type { Session } from './session.ts';

// An edit needs X Premium (D18): edited with it, edit-refused without, both as X answers them.
const editCheck = (session: Session, id: string): Check => {
  const edited = session.run(['update', '--on', 'x', '--id', id, '--text', textOf(session, 'an edit')]);
  if (edited.ok) return check('edit the text', 'pass', `edited, new id ${String(edited.data['id'])}: deleting the first id deletes both`);
  return edited.code === 'edit-refused' ? check('edit the text', 'note', 'edit-refused, as X answers an account without X Premium') : check('edit the text', 'fail', said(edited));
};

// D43: a text and an uploaded image, an edit of the text, then every post deleted.
const publishChecks = (session: Session): ReadonlyArray<Check> => {
  const made = nothingMade();
  const text = postAndKeep(session, 'post a text', ['--to', 'x', '--text', textOf(session, 'a text')], made);
  const image =
    session.imageFile === undefined
      ? []
      : [postAndKeep(session, 'upload an image file', ['--to', 'x', '--image', session.imageFile, '--text', textOf(session, 'an image')], made).check];
  const edit = text.id === undefined ? [] : [editCheck(session, text.id)];
  return [text.check, ...image, ...edit, ...deleteMade(session, 'x', made)];
};

export const xQa = async (session: Session): Promise<Findings> => {
  const status = statusCheck('x', session.run(['status', 'x']), (data) => `access ${String(data['accessLevel'])}, keys from ${String(pick(data, 'keys', 'source'))}`);
  if (status.outcome === 'fail') return { checks: [status], byHand: [] };
  const renewal = session.renewal ? [check('renew the keys', 'note', 'X keys never expire, so nothing renews them')] : [];
  const checks = [status, ...(session.publish ? publishChecks(session) : []), ...renewal];
  return { checks, byHand: session.publish ? [] : ['Run again with --publish to post and delete the test posts (about $0.10 of X credits).'] };
};
