import type { ImageUrl } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { threadsPostId } from '../domain/threads-post-id.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import { splitForThreads, THREADS_TEXT_LIMIT, threadsTextLength } from '../domain/threads-text.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';
import type { PublishedPost, Threads, ThreadsError } from './ports/threads.ts';

export type PublishPostInput = {
  readonly text?: string;
  readonly imageUrl?: ImageUrl;
  // Post a text over the limit as a thread of replies instead of refusing it.
  readonly split?: boolean;
};

export type PublishSummary = PublishedPost & {
  readonly platform: 'threads';
  // The reply ids of a split thread, in order; absent for a single post.
  readonly replies?: ReadonlyArray<string>;
};

export type PublishError = StepError & { readonly platform: 'threads' };

export type PublishPost = (input: PublishPostInput) => Promise<Result<PublishSummary, PublishError>>;

export type PublishPostDeps = {
  readonly threads: Threads;
  readonly logger: Logger;
};

type ThreadBreak = { readonly error: ThreadsError; readonly published: ReadonlyArray<ThreadsPostId> };

const partsOf = (input: PublishPostInput): Result<ReadonlyArray<string>, PublishError> => {
  const text = input.text ?? '';
  const length = threadsTextLength(text);
  if (length <= THREADS_TEXT_LIMIT) return ok([text]);
  if (input.split !== true) {
    return err({
      step: 'validate',
      platform: 'threads',
      cause: 'text-too-long',
      message: `The text counts ${length} characters the way Threads counts them; the limit is ${THREADS_TEXT_LIMIT}.`,
    });
  }
  return ok(splitForThreads(text));
};

const publishFirst = async (threads: Threads, imageUrl: ImageUrl | undefined, text: string): Promise<Result<PublishedPost, ThreadsError>> => {
  if (imageUrl === undefined) return threads.publishText(text);
  return threads.publishImage(imageUrl, text === '' ? undefined : text);
};

const publishFailed = (logger: Logger, error: ThreadsError): Result<never, PublishError> => {
  logger.warn('threads.publish.failed', { cause: error.kind });
  return err({ step: 'publish', platform: 'threads', cause: error.kind, message: error.message });
};

// Each reply answers the part before it, as Threads' own "add to thread" does.
const publishReplies = async (threads: Threads, first: ThreadsPostId, texts: ReadonlyArray<string>): Promise<Result<ReadonlyArray<ThreadsPostId>, ThreadBreak>> => {
  const published: ThreadsPostId[] = [];
  let previous = first;
  for (const text of texts) {
    const reply = await threads.publishReply(previous, text);
    if (!reply.ok) return err({ error: reply.error, published });
    published.push(reply.value);
    previous = reply.value;
  }
  return ok(published);
};

const tryDelete = async (threads: Threads, id: ThreadsPostId): Promise<{ readonly id: ThreadsPostId; readonly deleted: boolean }> => {
  const outcome = await threads.deletePost(id);
  return { id, deleted: outcome.ok };
};

// One at a time, in the order given: a reply goes before the post it answers.
const deleteInOrder = async (threads: Threads, ids: ReadonlyArray<ThreadsPostId>): Promise<ReadonlyArray<{ readonly id: ThreadsPostId; readonly deleted: boolean }>> => {
  if (ids.length === 0) return [];
  const [next, ...rest] = ids;
  const outcome = await tryDelete(threads, next);
  return [outcome, ...(await deleteInOrder(threads, rest))];
};

// No incomplete threads: delete what went out, newest first, and say what stayed behind.
const rollBack = async (deps: PublishPostDeps, published: ReadonlyArray<ThreadsPostId>, cause: ThreadsError, total: number): Promise<PublishError> => {
  const outcomes = await deleteInOrder(deps.threads, published.toReversed());
  const deleted = outcomes.filter((outcome) => outcome.deleted).map((outcome) => outcome.id);
  const leftBehind = outcomes.filter((outcome) => !outcome.deleted).map((outcome) => outcome.id);
  deps.logger.warn('threads.thread.rolled-back', { deleted: deleted.length, leftBehind: leftBehind.length });
  const summary = `The thread was rolled back: ${deleted.length} published part(s) deleted, ${leftBehind.length} left behind.`;
  return {
    step: 'publish',
    platform: 'threads',
    cause: cause.kind,
    message: `Part ${published.length + 1} of ${total} failed: ${cause.message}. ${summary}`,
    details: { deleted, leftBehind },
  };
};

const continueThread = async (deps: PublishPostDeps, first: PublishedPost, texts: ReadonlyArray<string>, total: number): Promise<Result<PublishSummary, PublishError>> => {
  const firstId = threadsPostId(first.id);
  const replies = await publishReplies(deps.threads, firstId, texts);
  if (!replies.ok) return err(await rollBack(deps, [firstId, ...replies.error.published], replies.error.error, total));
  return ok({ platform: 'threads', ...first, replies: replies.value });
};

export const createPublishPost =
  (deps: PublishPostDeps): PublishPost =>
  async (input) => {
    const parts = partsOf(input);
    if (!parts.ok) return parts;
    const [firstText, ...replyTexts] = parts.value;
    const first = await publishFirst(deps.threads, input.imageUrl, firstText);
    if (!first.ok) return publishFailed(deps.logger, first.error);
    if (replyTexts.length === 0) return ok({ platform: 'threads', ...first.value });
    return continueThread(deps, first.value, replyTexts, parts.value.length);
  };
