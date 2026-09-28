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
 *
 *   import { createFacebookGraph } from 'panda-social-cli';
 *   const posted = await createFacebookGraph({ token: pageToken }).publishText(pageId, 'Hello from panda');
 *
 *   import { createInstagramGraph } from 'panda-social-cli';
 *   const posted = await createInstagramGraph({ token }).publishImage(userId, imageUrl, 'A cat on the sofa');
 */

export { FACEBOOK_IMAGE_MAX_BYTES, parseFacebookImage } from './domain/facebook-image.ts';
export type { FacebookImage, FacebookImageError, FacebookImageFormat } from './domain/facebook-image.ts';
export { parseFacebookPageId } from './domain/facebook-page.ts';
export type { FacebookPageId, FacebookPageIdError, GrantedPage } from './domain/facebook-page.ts';
export { parseFacebookPostId } from './domain/facebook-post-id.ts';
export type { FacebookPostId, FacebookPostIdError } from './domain/facebook-post-id.ts';
export { parseImageUrl } from './domain/image-url.ts';
export type { ImageUrl, ImageUrlError } from './domain/image-url.ts';
export { parseInstagramMediaId } from './domain/instagram-media-id.ts';
export type { InstagramMediaId, InstagramMediaIdError } from './domain/instagram-media-id.ts';
export { parseInstagramUserId } from './domain/instagram-user-id.ts';
export type { InstagramUserId, InstagramUserIdError } from './domain/instagram-user-id.ts';
export { err, ok } from './domain/result.ts';
export type { Result } from './domain/result.ts';
export type { ThreadsUserId } from './domain/threads-user-id.ts';
export { parseXImage, X_IMAGE_MAX_BYTES } from './domain/x-image.ts';
export type { XImage, XImageError, XImageFormat } from './domain/x-image.ts';
export type { XKeys } from './domain/x-keys.ts';
export { parseXPostId } from './domain/x-post-id.ts';
export type { XPostId, XPostIdError } from './domain/x-post-id.ts';
export { splitForX, X_TEXT_LIMIT, xTextLength } from './domain/x-text.ts';

export { createFacebookGraph, FACEBOOK_GRAPH_BASE } from './infra/facebook-graph.ts';
export type { FacebookGraphConfig } from './infra/facebook-graph.ts';
export { createInstagramGraph, INSTAGRAM_GRAPH_BASE } from './infra/instagram-graph.ts';
export type { InstagramGraphConfig } from './infra/instagram-graph.ts';
export { createWinstonLogger } from './infra/logger.ts';
export { createThreadsGraph, THREADS_GRAPH_BASE } from './infra/threads-graph.ts';
export type { ThreadsGraphConfig } from './infra/threads-graph.ts';
export { createXApi, X_API_BASE } from './infra/x-api.ts';
export type { XApiConfig } from './infra/x-api.ts';

export type { Facebook, FacebookError, FacebookPage, FacebookPhoto, FacebookPublishedPost } from './use-cases/ports/facebook.ts';
export type { Instagram, InstagramAccount, InstagramError, InstagramPublishedPost } from './use-cases/ports/instagram.ts';
export type { Logger, LogMeta } from './use-cases/ports/logger.ts';
export type { StepError } from './use-cases/ports/step-error.ts';
export type { PublishedPost, PublishingLimits, Quota, RefreshedToken, Threads, ThreadsAccount, ThreadsError } from './use-cases/ports/threads.ts';
export type { X, XAccount, XError, XPostDraft, XPublishedPost } from './use-cases/ports/x.ts';

export { createPublishPost } from './use-cases/publish-post.ts';
export type { PublishError, PublishPost, PublishPostDeps, PublishPostInput, PublishSummary } from './use-cases/publish-post.ts';
