import { describe, expect, it } from 'bun:test';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { instagramMediaIdUnsafe } from '../domain/instagram-media-id.ts';
import { instagramUserIdUnsafe } from '../domain/instagram-user-id.ts';
import { err, ok } from '../domain/result.ts';
import { createInstagramFake } from '../test-helpers/instagram-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createPublishInstagramPost } from './publish-instagram-post.ts';

const ACCOUNT = { userId: instagramUserIdUnsafe('17841400000000001'), username: 'panda' };
const IMAGE = imageUrlUnsafe('https://cdn.example.com/cat.jpg');

describe('publishing on Instagram', () => {
  it('an image with a caption is published to the account the token belongs to, and the agent gets the platform, the id and the link', async () => {
    const instagram = createInstagramFake({ account: ACCOUNT });
    const publish = createPublishInstagramPost({ instagram, logger: createLoggerFake() });

    const result = await publish({ imageUrl: IMAGE, caption: 'A cat on the sofa' });

    expect(result).toEqual(ok({ platform: 'instagram', id: instagramMediaIdUnsafe('17900000000000001'), url: 'https://www.instagram.com/p/Fake/' }));
    expect(instagram.posts).toEqual([{ userId: '17841400000000001', imageUrl: 'https://cdn.example.com/cat.jpg', caption: 'A cat on the sofa' }]);
    expect(instagram.events).toEqual(['publish:17841400000000001']);
  });

  it('an image without a caption goes out with no caption', async () => {
    const instagram = createInstagramFake({ account: ACCOUNT });

    const result = await createPublishInstagramPost({ instagram, logger: createLoggerFake() })({ imageUrl: IMAGE });

    expect(result.ok).toBe(true);
    expect(instagram.posts).toEqual([{ userId: '17841400000000001', imageUrl: 'https://cdn.example.com/cat.jpg' }]);
  });

  it('when Instagram refuses the image, the post fails at the publish step with image-rejected, and a warning names the cause', async () => {
    const instagram = createInstagramFake({ account: ACCOUNT, errors: { publishImage: { kind: 'image-rejected', message: 'The media could not be fetched' } } });
    const logger = createLoggerFake();

    const result = await createPublishInstagramPost({ instagram, logger })({ imageUrl: IMAGE, caption: 'A cat on the sofa' });

    expect(result).toEqual(err({ step: 'publish', platform: 'instagram', cause: 'image-rejected', message: 'The media could not be fetched' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'instagram.publish.failed', meta: { cause: 'image-rejected' } }]);
  });

  it('when Instagram refuses the token, the post fails at the verify step and nothing is published', async () => {
    const instagram = createInstagramFake({ errors: { whoAmI: { kind: 'unauthorized', message: 'token refused' } } });

    const result = await createPublishInstagramPost({ instagram, logger: createLoggerFake() })({ imageUrl: IMAGE });

    expect(result).toEqual(err({ step: 'verify', platform: 'instagram', cause: 'unauthorized', message: 'token refused' }));
    expect(instagram.events).toEqual([]);
  });
});
