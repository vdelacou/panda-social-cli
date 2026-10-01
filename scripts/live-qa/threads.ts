import { deleteMade, nothingMade, postAndKeep } from './posting.ts';
import { renewalChecks } from './renewal.ts';
import { postsQuota, statusCheck, tokenDetail } from './report.ts';
import type { Check, Findings } from './report.ts';
import { textOf } from './session.ts';
import type { Session } from './session.ts';

// Past the 500 characters Threads allows in one post, so --split posts it as a thread of replies.
const LONG_TEXT = 'This sentence repeats until the text runs past the 500 characters Threads allows, so --split cuts it into replies. '.repeat(6);

// D43: a text, an image by URL and a --split thread, then every post deleted.
const publishChecks = (session: Session): ReadonlyArray<Check> => {
  const made = nothingMade();
  const image = session.image === undefined ? [] : [['post an image by URL', ['--to', 'threads', '--image', session.image, '--text', textOf(session, 'an image')]] as const];
  const posts = [
    ['post a text', ['--to', 'threads', '--text', textOf(session, 'a text')]] as const,
    ...image,
    ['post a long text with --split', ['--to', 'threads', '--text', textOf(session, LONG_TEXT), '--split']] as const,
  ].map(([name, args]) => postAndKeep(session, name, args, made).check);
  return [...posts, ...deleteMade(session, 'threads', made)];
};

export const threadsQa = async (session: Session): Promise<Findings> => {
  const status = statusCheck('threads', session.run(['status', 'threads']), (data) => `${tokenDetail(data)}, ${postsQuota(data)}`);
  if (status.outcome === 'fail') return { checks: [status], byHand: [] };
  const checks = [status, ...(session.publish ? publishChecks(session) : []), ...(session.renewal ? await renewalChecks(session, 'threads') : [])];
  return { checks, byHand: session.publish ? [] : ['Run again with --publish to post and delete the test posts.'] };
};
