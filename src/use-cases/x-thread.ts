import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XPostId } from '../domain/x-post-id.ts';
import type { X, XError } from './ports/x.ts';
import type { XPostDeps, XPublishError } from './x-posting.ts';

type ThreadBreak = { readonly error: XError; readonly published: ReadonlyArray<XPostId> };

type Outcome = { readonly id: XPostId; readonly deleted: boolean };

// Each reply answers the part before it, as X's own threads do.
export const publishReplies = async (x: X, first: XPostId, texts: ReadonlyArray<string>): Promise<Result<ReadonlyArray<XPostId>, ThreadBreak>> => {
  const published: XPostId[] = [];
  let previous = first;
  for (const text of texts) {
    const reply = await x.createPost({ text, replyTo: previous });
    if (!reply.ok) return err({ error: reply.error, published });
    published.push(reply.value.id);
    previous = reply.value.id;
  }
  return ok(published);
};

const tryDelete = async (x: X, id: XPostId): Promise<Outcome> => {
  const outcome = await x.deletePost(id);
  return { id, deleted: outcome.ok };
};

// One at a time, in the order given: a reply goes before the post it answers.
const deleteInOrder = async (x: X, ids: ReadonlyArray<XPostId>): Promise<ReadonlyArray<Outcome>> => {
  if (ids.length === 0) return [];
  const [next, ...rest] = ids;
  const outcome = await tryDelete(x, next);
  return [outcome, ...(await deleteInOrder(x, rest))];
};

// No incomplete threads: delete what went out, newest first, and say what stayed behind.
export const rollBack = async (deps: XPostDeps, published: ReadonlyArray<XPostId>, cause: XError, total: number): Promise<XPublishError> => {
  const outcomes = await deleteInOrder(deps.x, published.toReversed());
  const deleted = outcomes.filter((outcome) => outcome.deleted).map((outcome) => outcome.id);
  const leftBehind = outcomes.filter((outcome) => !outcome.deleted).map((outcome) => outcome.id);
  deps.logger.warn('x.thread.rolled-back', { deleted: deleted.length, leftBehind: leftBehind.length });
  const summary = `The thread was rolled back: ${deleted.length} published part(s) deleted, ${leftBehind.length} left behind.`;
  return {
    step: 'publish',
    platform: 'x',
    cause: cause.kind,
    message: `Part ${published.length + 1} of ${total} failed: ${cause.message}. ${summary}`,
    details: { deleted, leftBehind },
  };
};
