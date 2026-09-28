import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Logger } from './ports/logger.ts';
import type { StepError } from './ports/step-error.ts';
import type { PublishedPost, Threads } from './ports/threads.ts';

export type PublishPostInput = { readonly text: string };

export type PublishSummary = PublishedPost & { readonly platform: 'threads' };

export type PublishError = StepError & { readonly platform: 'threads' };

export type PublishPost = (input: PublishPostInput) => Promise<Result<PublishSummary, PublishError>>;

export type PublishPostDeps = {
  readonly threads: Threads;
  readonly logger: Logger;
};

export const createPublishPost =
  (deps: PublishPostDeps): PublishPost =>
  async (input) => {
    const published = await deps.threads.publishText(input.text);
    if (!published.ok) {
      deps.logger.warn('threads.publish.failed', { cause: published.error.kind });
      return err({ step: 'publish', platform: 'threads', cause: published.error.kind, message: published.error.message });
    }
    return ok({ platform: 'threads', ...published.value });
  };
