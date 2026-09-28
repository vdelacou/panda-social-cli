import { describe, expect, it } from 'bun:test';
import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import { imagePathUnsafe } from '../domain/image-path.ts';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import { createFacebookFake } from '../test-helpers/facebook-fake.ts';
import type { FacebookFake, FacebookFakeConfig } from '../test-helpers/facebook-fake.ts';
import { createImageFilesFake } from '../test-helpers/image-files-fake.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import type { LoggerFake } from '../test-helpers/logger-fake.ts';
import { createPublishFacebookPost } from './publish-facebook-post.ts';
import type { PublishFacebookPost } from './publish-facebook-post.ts';

const PAGE = facebookPageIdUnsafe('104000000000001');
const P1 = '104000000000001_122000000000001';
const P2 = '104000000000001_122000000000002';
const P3 = '104000000000001_122000000000003';
const link = (id: string): string => `https://www.facebook.com/104000000000001/posts/${id.slice('104000000000001_'.length)}`;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const NOTES = new Uint8Array(Array.from('Just some notes', (char) => char.codePointAt(0) ?? 0));
const CAT = 'https://cdn.example.com/cat.jpg';

type Publishing = { readonly facebook: FacebookFake; readonly logger: LoggerFake; readonly publish: PublishFacebookPost };

const publishWith = (config?: FacebookFakeConfig, files: Readonly<Record<string, Uint8Array>> = {}): Publishing => {
  const facebook = createFacebookFake(config);
  const logger = createLoggerFake();
  return { facebook, logger, publish: createPublishFacebookPost({ facebook, files: createImageFilesFake(files), logger }) };
};

describe('publishing a post to a Facebook Page', () => {
  it('when an agent posts "Hello from panda" to the Page, it gets back the post id and its facebook.com link, and the post goes to that Page', async () => {
    const { facebook, publish } = publishWith();

    const result = await publish({ pageId: PAGE, text: 'Hello from panda' });

    expect(result).toEqual(ok({ platform: 'facebook', id: P1, url: link(P1) }));
    expect(facebook.posts).toEqual([{ id: P1, pageId: '104000000000001', text: 'Hello from panda' }]);
  });

  it('an https image goes to Meta as its URL with the text as caption, a local file is read, checked and uploaded, and an image alone goes out without a caption', async () => {
    const { facebook, publish } = publishWith(undefined, { './chart.png': PNG });

    await publish({ pageId: PAGE, text: 'A cat on the sofa', imageUrl: imageUrlUnsafe(CAT) });
    await publish({ pageId: PAGE, text: 'The chart', imagePath: imagePathUnsafe('./chart.png') });
    await publish({ pageId: PAGE, imagePath: imagePathUnsafe('./chart.png') });

    expect(facebook.posts).toEqual([
      { id: P1, pageId: '104000000000001', text: 'A cat on the sofa', photo: CAT },
      { id: P2, pageId: '104000000000001', text: 'The chart', photo: 'upload:png' },
      { id: P3, pageId: '104000000000001', photo: 'upload:png' },
    ]);
  });

  it('a local file that is missing, or is not a JPEG, PNG, GIF, BMP or TIFF, is refused as invalid-image before Meta is asked anything', async () => {
    const { facebook, publish } = publishWith(undefined, { './notes.txt': NOTES });

    const missing = await publish({ pageId: PAGE, imagePath: imagePathUnsafe('./missing.png') });
    const notes = await publish({ pageId: PAGE, text: 'Notes', imagePath: imagePathUnsafe('./notes.txt') });

    expect(missing).toEqual(err({ step: 'validate', platform: 'facebook', cause: 'invalid-image', message: 'No file at "./missing.png".' }));
    expect(notes).toEqual(err({ step: 'validate', platform: 'facebook', cause: 'invalid-image', message: '"./notes.txt" is not a JPEG, PNG, GIF, BMP or TIFF image.' }));
    expect(facebook.events).toEqual([]);
  });

  it('a text of 5,000 characters goes out whole, as one post: Facebook has no short limit to split for', async () => {
    const { facebook, publish } = publishWith();

    const result = await publish({ pageId: PAGE, text: 'a'.repeat(5000) });

    expect(result).toEqual(ok({ platform: 'facebook', id: P1, url: link(P1) }));
    expect(facebook.posts).toEqual([{ id: P1, pageId: '104000000000001', text: 'a'.repeat(5000) }]);
  });

  it("when Meta refuses the post, the agent gets Meta's cause naming the publish step, image-rejected for a photo Meta cannot use, and the log names the cause without the text", async () => {
    const photo = publishWith({ errors: { publish: { kind: 'image-rejected', message: '(#324) Missing or invalid image file' } } });
    const post = publishWith({ errors: { publish: { kind: 'forbidden', message: '(#200) Permissions error' } } });

    const rejectedImage = await photo.publish({ pageId: PAGE, imageUrl: imageUrlUnsafe(CAT) });
    const refused = await post.publish({ pageId: PAGE, text: 'Secret launch plans' });

    expect(rejectedImage).toEqual(err({ step: 'publish', platform: 'facebook', cause: 'image-rejected', message: '(#324) Missing or invalid image file' }));
    expect(refused).toEqual(err({ step: 'publish', platform: 'facebook', cause: 'forbidden', message: '(#200) Permissions error' }));
    expect(post.logger.calls).toEqual([{ level: 'warn', event: 'facebook.publish.failed', meta: { cause: 'forbidden' } }]);
  });
});
