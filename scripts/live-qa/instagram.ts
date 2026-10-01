import { nothingMade, postAndKeep } from './posting.ts';
import type { Made } from './posting.ts';
import { renewalChecks } from './renewal.ts';
import { check, postsQuota, said, statusCheck, tokenDetail } from './report.ts';
import type { Check, Findings } from './report.ts';
import { textOf } from './session.ts';
import type { Session } from './session.ts';

// A public PNG: Instagram takes JPEG only, so its refusal shows what an ERROR container says (D35).
const REFUSED_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';

const refusalCheck = (session: Session, made: Made): Check => {
  const refused = session.run(['post', '--to', 'instagram', '--image', REFUSED_IMAGE, '--text', textOf(session, 'a PNG')]);
  if (refused.ok) {
    made.ids.push(String(refused.data['id']));
    return check('offer a PNG', 'fail', 'Instagram took the PNG');
  }
  return check('offer a PNG', refused.code === 'image-rejected' ? 'pass' : 'note', said(refused));
};

// D37: Instagram Login cannot delete, so delete answers unsupported before asking Instagram.
const deleteCheck = (session: Session, id: string): Check => {
  const deleted = session.run(['delete', '--on', 'instagram', '--id', id]);
  return check('delete answers unsupported', !deleted.ok && deleted.code === 'unsupported' ? 'pass' : 'fail', said(deleted));
};

// D43: an image by URL, a PNG Instagram should refuse, and the delete that cannot happen.
const publishChecks = (session: Session, made: Made): ReadonlyArray<Check> => {
  if (session.image === undefined) return [check('post an image by URL', 'fail', 'pass --image with a public https URL to a JPEG: Instagram posts images only')];
  const posted = postAndKeep(session, 'post an image by URL', ['--to', 'instagram', '--image', session.image, '--text', textOf(session, 'an image')], made);
  return [posted.check, refusalCheck(session, made), ...(posted.id === undefined ? [] : [deleteCheck(session, posted.id)])];
};

export const instagramQa = async (session: Session): Promise<Findings> => {
  const status = statusCheck('instagram', session.run(['status', 'instagram']), (data) => `${tokenDetail(data)}, ${postsQuota(data)}`);
  if (status.outcome === 'fail') return { checks: [status], byHand: [] };
  const made = nothingMade();
  const checks = [status, ...(session.publish ? publishChecks(session, made) : []), ...(session.renewal ? await renewalChecks(session, 'instagram') : [])];
  const cleanup =
    made.ids.length === 0
      ? []
      : [`Open the new posts (${made.ids.join(', ')}) in a private window, say whether they show, then delete them in the Instagram app: Instagram Login cannot.`];
  return { checks, byHand: session.publish ? cleanup : ['Run again with --publish and --image to post a test image.'] };
};
