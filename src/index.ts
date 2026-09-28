/*
 * Public library API of panda-social-cli. Everything exported here follows
 * semver; everything else (presenter, composition, fakes) is implementation
 * detail.
 *
 *   import { createThreadsGraph } from 'panda-social-cli';
 *   const posted = await createThreadsGraph({ token }).publishText('Hello from panda');
 */

export { err, ok } from './domain/result.ts';
export type { Result } from './domain/result.ts';

export { createWinstonLogger } from './infra/logger.ts';
export { createThreadsGraph, THREADS_GRAPH_BASE } from './infra/threads-graph.ts';
export type { ThreadsGraphConfig } from './infra/threads-graph.ts';

export type { Logger, LogMeta } from './use-cases/ports/logger.ts';
export type { StepError } from './use-cases/ports/step-error.ts';
export type { PublishedPost, Threads, ThreadsError } from './use-cases/ports/threads.ts';

export { createPublishPost } from './use-cases/publish-post.ts';
export type { PublishError, PublishPost, PublishPostDeps, PublishPostInput, PublishSummary } from './use-cases/publish-post.ts';
