import type { ImagePath } from '../domain/image-path.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { splitForX, X_TEXT_LIMIT } from '../domain/x-text.ts';
import type { Logger } from './ports/logger.ts';
import type { XError, XPublishedPost } from './ports/x.ts';
import { attachImage, measureText } from './x-posting.ts';
import type { XPublishDeps, XPublishError, XPublishSummary } from './x-posting.ts';
import { publishReplies, rollBack } from './x-thread.ts';

export type PublishXPostInput = {
  readonly text?: string;
  readonly imagePath?: ImagePath;
  // Post a text over the limit as a thread of replies instead of refusing it.
  readonly split?: boolean;
};

export type PublishXPost = (input: PublishXPostInput) => Promise<Result<XPublishSummary, XPublishError>>;

const partsOf = (input: PublishXPostInput): Result<ReadonlyArray<string>, XPublishError> => {
  const measured = measureText(input.text);
  if (measured.fits) return ok([measured.text]);
  if (input.split === true) return ok(splitForX(measured.text));
  const message = `The text counts ${measured.length} characters the way X counts them; the limit is ${X_TEXT_LIMIT}.`;
  return err({ step: 'validate', platform: 'x', cause: 'text-too-long', message });
};

const publishFailed = (logger: Logger, error: XError): Result<never, XPublishError> => {
  logger.warn('x.publish.failed', { cause: error.kind });
  return err({ step: 'publish', platform: 'x', cause: error.kind, message: error.message });
};

const continueThread = async (deps: XPublishDeps, first: XPublishedPost, texts: ReadonlyArray<string>, total: number): Promise<Result<XPublishSummary, XPublishError>> => {
  const replies = await publishReplies(deps.x, first.id, texts);
  if (!replies.ok) return err(await rollBack(deps, [first.id, ...replies.error.published], replies.error.error, total));
  return ok({ platform: 'x', ...first, replies: replies.value });
};

// The text is checked first and the image next, so nothing reaches X, and no credit is
// spent, until both are known to fit.
export const createPublishXPost =
  (deps: XPublishDeps): PublishXPost =>
  async (input) => {
    const parts = partsOf(input);
    if (!parts.ok) return parts;
    const media = await attachImage(deps, input.imagePath);
    if (!media.ok) return media;
    const [firstText, ...replyTexts] = parts.value;
    const first = await deps.x.createPost({ text: firstText, ...(media.value && { mediaIds: media.value }) });
    if (!first.ok) return publishFailed(deps.logger, first.error);
    if (replyTexts.length === 0) return ok({ platform: 'x', ...first.value });
    return continueThread(deps, first.value, replyTexts, parts.value.length);
  };
