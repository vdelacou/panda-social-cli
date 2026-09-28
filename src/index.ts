/*
 * Public library API of panda-social-cli. Everything exported here follows
 * semver; everything else (presenter, composition, fakes) is implementation
 * detail.
 *
 *   import { createThreadsGraph } from 'panda-social-cli';
 *   const posted = await createThreadsGraph({ token }).publishText('Hello from panda');
 *
 *   import { createXApi } from 'panda-social-cli';
 *   const posted = await createXApi({ keys }).createPost({ text: 'Hello from panda' });
 */

export { err, ok } from './domain/result.ts';
export type { Result } from './domain/result.ts';
export type { ThreadsUserId } from './domain/threads-user-id.ts';
export { parseXImage, X_IMAGE_MAX_BYTES } from './domain/x-image.ts';
export type { XImage, XImageError, XImageFormat } from './domain/x-image.ts';
export type { XKeys } from './domain/x-keys.ts';
export { parseXPostId } from './domain/x-post-id.ts';
export type { XPostId, XPostIdError } from './domain/x-post-id.ts';
export { splitForX, X_TEXT_LIMIT, xTextLength } from './domain/x-text.ts';

export { createWinstonLogger } from './infra/logger.ts';
export { createThreadsGraph, THREADS_GRAPH_BASE } from './infra/threads-graph.ts';
export type { ThreadsGraphConfig } from './infra/threads-graph.ts';
export { createXApi, X_API_BASE } from './infra/x-api.ts';
export type { XApiConfig } from './infra/x-api.ts';

export type { Logger, LogMeta } from './use-cases/ports/logger.ts';
export type { StepError } from './use-cases/ports/step-error.ts';
export type { PublishedPost, PublishingLimits, Quota, RefreshedToken, Threads, ThreadsAccount, ThreadsError } from './use-cases/ports/threads.ts';
export type { X, XAccount, XError, XPostDraft, XPublishedPost } from './use-cases/ports/x.ts';

export { createPublishPost } from './use-cases/publish-post.ts';
export type { PublishError, PublishPost, PublishPostDeps, PublishPostInput, PublishSummary } from './use-cases/publish-post.ts';
