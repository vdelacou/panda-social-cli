import { describe, expect, it } from 'bun:test';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCrossPost } from './cross-post.ts';
import type { StepError } from './ports/step-error.ts';

type Target = { readonly platform: string; readonly text: string };

type Posting = {
  readonly asked: ReadonlyArray<string>;
  readonly post: (target: Target) => Promise<Result<unknown, StepError>>;
};

// Each platform answers what the test gives it, and the order they were asked in is kept.
const postingWith = (answers: Readonly<Record<string, Result<unknown, StepError>>>): Posting => {
  const asked: string[] = [];
  return {
    asked,
    post: async (target) => {
      asked.push(target.platform);
      return answers[target.platform] ?? err({ step: 'post', cause: 'rejected', message: `no answer for ${target.platform}` });
    },
  };
};

const postOn = (platform: string, id: string): { readonly platform: string; readonly id: string; readonly url: string } => ({
  platform,
  id,
  url: `https://example.com/${platform}/${id}`,
});

const TARGETS: ReadonlyArray<Target> = [
  { platform: 'threads', text: 'Hello from panda' },
  { platform: 'x', text: 'Hello from panda' },
  { platform: 'facebook', text: 'Hello from panda' },
];

describe('cross-posting', () => {
  it('three platforms post one after another, in the order given, and when all succeed the answer lists every post as that platform answers it alone', async () => {
    const posting = postingWith({ threads: ok(postOn('threads', '1')), x: ok(postOn('x', '2')), facebook: ok(postOn('facebook', '3')) });

    const result = await createCrossPost({ post: posting.post })(TARGETS);

    expect(result).toEqual(ok({ posts: [postOn('threads', '1'), postOn('x', '2'), postOn('facebook', '3')] }));
    expect(posting.asked).toEqual(['threads', 'x', 'facebook']);
  });

  it('when one platform fails, the ones after it still post, and the answer is partly-published with the posts that exist and the failure with its code, message and details', async () => {
    const rolledBack = { deleted: ['17890000000000001'], leftBehind: [] };
    const posting = postingWith({
      threads: err({ step: 'publish', cause: 'rejected', message: 'Part 2 of 2 failed.', details: rolledBack }),
      x: ok(postOn('x', '2')),
      facebook: ok(postOn('facebook', '3')),
    });

    const result = await createCrossPost({ post: posting.post })(TARGETS);

    expect(result).toEqual(
      err({
        step: 'post',
        cause: 'partly-published',
        message: 'Posted on x, facebook; failed on threads.',
        details: {
          published: [postOn('x', '2'), postOn('facebook', '3')],
          failed: [{ platform: 'threads', code: 'rejected', message: 'Part 2 of 2 failed.', details: rolledBack }],
        },
      })
    );
    expect(posting.asked).toEqual(['threads', 'x', 'facebook']);
  });

  it('when every platform fails, the answer is not-published, listing each failure', async () => {
    const posting = postingWith({
      threads: err({ step: 'load', cause: 'missing-credentials', message: 'No Threads token is configured.' }),
      x: err({ step: 'validate', cause: 'text-too-long', message: 'The text counts 301 characters.' }),
      facebook: err({ step: 'publish', cause: 'timeout', message: 'The operation timed out.' }),
    });

    const result = await createCrossPost({ post: posting.post })(TARGETS);

    expect(result).toEqual(
      err({
        step: 'post',
        cause: 'not-published',
        message: 'Nothing was posted; failed on threads, x, facebook.',
        details: {
          published: [],
          failed: [
            { platform: 'threads', code: 'missing-credentials', message: 'No Threads token is configured.' },
            { platform: 'x', code: 'text-too-long', message: 'The text counts 301 characters.' },
            { platform: 'facebook', code: 'timeout', message: 'The operation timed out.' },
          ],
        },
      })
    );
  });
});
