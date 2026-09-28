import { describe, expect, it } from 'bun:test';
import { err, ok } from '../domain/result.ts';
import { createLoggerFake } from '../test-helpers/logger-fake.ts';
import { createThreadsFake } from '../test-helpers/threads-fake.ts';
import { createPublishPost } from './publish-post.ts';

describe('publishing a post to Threads', () => {
  it('when an agent posts "Hello from panda" to Threads, it gets back the new post id and its link', async () => {
    const threads = createThreadsFake({ nextPost: { id: '17890000000000001', url: 'https://www.threads.com/@panda/post/C0ffee' } });
    const publishPost = createPublishPost({ threads, logger: createLoggerFake() });

    const result = await publishPost({ text: 'Hello from panda' });

    expect(result).toEqual(ok({ platform: 'threads', id: '17890000000000001', url: 'https://www.threads.com/@panda/post/C0ffee' }));
    expect(threads.published).toEqual(['Hello from panda']);
  });

  it('when Threads rejects the token, the agent gets an unauthorized error that names the publish step', async () => {
    const threads = createThreadsFake({ errors: { publishText: { kind: 'unauthorized', message: 'token expired' } } });
    const logger = createLoggerFake();
    const publishPost = createPublishPost({ threads, logger });

    const result = await publishPost({ text: 'Hello from panda' });

    expect(result).toEqual(err({ step: 'publish', platform: 'threads', cause: 'unauthorized', message: 'token expired' }));
    expect(logger.calls).toEqual([{ level: 'warn', event: 'threads.publish.failed', meta: { cause: 'unauthorized' } }]);
  });
});
