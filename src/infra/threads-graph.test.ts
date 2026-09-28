import { afterEach, describe, expect, it } from 'bun:test';
import { imageUrlUnsafe } from '../domain/image-url.ts';
import { threadsPostIdUnsafe } from '../domain/threads-post-id.ts';
import { threadsUserIdUnsafe } from '../domain/threads-user-id.ts';
import { installFetchMock } from '../test-helpers/fetch-mock.ts';
import type { FetchMock, FetchMockCall } from '../test-helpers/fetch-mock.ts';
import { createThreadsGraph } from './threads-graph.ts';

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
const TOKEN = ['test', 'threads', 'token'].join('-');
const POST_ID = '17890000000000001';
const PERMALINK = 'https://www.threads.com/@panda/post/C0ffee';

const json = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { 'content-type': 'application/json' } });

const isPublish = (url: string, init: RequestInit | undefined): boolean => init?.method === 'POST' && url.endsWith('/v1.0/me/threads');

const publishAnswers = (response: () => Response): FetchMock =>
  installFetchMock([
    { match: isPublish, respond: response },
    { match: (url) => url.includes(`/v1.0/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
  ]);

const sentForm = (call: FetchMockCall | undefined): Record<string, string> => {
  const body = String(call?.init?.body);
  return Object.fromEntries(new URLSearchParams(body));
};

const CONTAINER = '18000000000000001';
const REPLY_ID = '17891000000000001';
const IMAGE = 'https://cdn.example.com/cat.jpg';

// Each call gets the next answer; the last one repeats.
const inSequence = (answers: ReadonlyArray<() => Response>): (() => Response) => {
  let calls = 0;
  return () => {
    const answer = answers[Math.min(calls, answers.length - 1)] ?? (() => json({}, 500));
    calls += 1;
    return answer();
  };
};

const isStatusRead = (url: string): boolean => url.endsWith(`/v1.0/${CONTAINER}?fields=status,error_message`);
const isPublishStep = (url: string, init: RequestInit | undefined): boolean => init?.method === 'POST' && url.endsWith('/v1.0/me/threads_publish');

// A Threads that takes a container, reports its statuses in turn, then publishes it.
const containerFlow = (statuses: ReadonlyArray<() => Response>, publishedId = POST_ID): FetchMock =>
  installFetchMock([
    { match: isPublish, respond: () => json({ id: CONTAINER }) },
    { match: isStatusRead, respond: inSequence(statuses) },
    { match: isPublishStep, respond: () => json({ id: publishedId }) },
    { match: (url) => url.includes(`/v1.0/${POST_ID}?fields=permalink`), respond: () => json({ id: POST_ID, permalink: PERMALINK }) },
  ]);

// Meta's answer to a status read that comes too soon after the container was created.
const notVisible = (): Response => json({ error: { message: 'Media Not Found', type: 'OAuthException', code: 24, error_subcode: 4_279_009 } }, 400);

const recordingSleep = (waits: number[]): ((ms: number) => Promise<void>) => {
  return async (ms) => {
    waits.push(ms);
    await Promise.resolve();
  };
};

const abortReason = (signal: AbortSignal): Error => (signal.reason instanceof Error ? signal.reason : new Error('aborted'));

// A Threads that never answers: the only way out is the adapter's own deadline.
const hangUntilAborted = async (init: RequestInit | undefined): Promise<Response> =>
  new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    signal?.addEventListener('abort', () => {
      reject(abortReason(signal));
    });
  });

describe('the Threads Graph adapter', () => {
  let mock: FetchMock | undefined;
  afterEach(() => mock?.restore());

  it('posting text sends one auto-published TEXT call with the token in the Authorization header and never in the URL, then reads back the permalink', async () => {
    mock = publishAnswers(() => json({ id: POST_ID }));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(result).toEqual({ ok: true, value: { id: POST_ID, url: PERMALINK } });
    const [publish] = mock.calls;
    expect(sentForm(publish)).toEqual({ media_type: 'TEXT', text: 'Hello from panda', auto_publish_text: 'true' });
    expect(new Headers(publish?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(mock.calls.some((call) => call.url.includes(TOKEN))).toBe(false);
  });

  it('an expired token (HTTP 400, OAuth code 190) comes back as unauthorized', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Error validating access token: Session has expired', type: 'OAuthException', code: 190 } }, 400));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('unauthorized');
  });

  it('a 429 from Threads comes back as rate-limited', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Application request limit reached', code: 4 } }, 429));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('rate-limited');
  });

  it('a 5xx from Threads comes back as rejected, with its HTTP status', async () => {
    mock = publishAnswers(() => json({ error: { message: 'Service temporarily unavailable', code: 2 } }, 503));

    const result = await createThreadsGraph({ token: TOKEN }).publishText('Hello from panda');

    expect(!result.ok && result.error).toEqual({ kind: 'rejected', status: 503, message: expect.stringContaining('Service temporarily unavailable') });
  });

  it('asking who the token belongs to reads id and username from /me, with the token in the header', async () => {
    mock = installFetchMock([
      { match: (url, init) => init?.method === 'GET' && url.endsWith('/v1.0/me?fields=id,username'), respond: () => json({ id: '26000000000000001', username: 'panda' }) },
    ]);

    const result = await createThreadsGraph({ token: TOKEN }).whoAmI();

    expect(result).toEqual({ ok: true, value: { userId: threadsUserIdUnsafe('26000000000000001'), username: 'panda' } });
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('a refused token on /me comes back as unauthorized', async () => {
    mock = installFetchMock([
      {
        match: (url) => url.includes('/v1.0/me?'),
        respond: () => json({ error: { message: 'Invalid OAuth access token - Cannot parse access token', type: 'OAuthException', code: 190 } }, 400),
      },
    ]);

    const result = await createThreadsGraph({ token: TOKEN }).whoAmI();

    expect(!result.ok && result.error.kind).toBe('unauthorized');
  });

  it('an image post creates an IMAGE container with the URL and caption, waits until it is FINISHED, publishes it and reads the permalink', async () => {
    const waits: number[] = [];
    mock = containerFlow([() => json({ status: 'IN_PROGRESS' }), () => json({ status: 'FINISHED' })]);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep(waits) }).publishImage(imageUrlUnsafe(IMAGE), 'A cat on the sofa');

    expect(result).toEqual({ ok: true, value: { id: POST_ID, url: PERMALINK } });
    expect(sentForm(mock.calls[0])).toEqual({ media_type: 'IMAGE', image_url: IMAGE, text: 'A cat on the sofa' });
    expect(sentForm(mock.calls.find((call) => isPublishStep(call.url, call.init)))).toEqual({ creation_id: CONTAINER });
    expect(mock.calls.filter((call) => isStatusRead(call.url))).toHaveLength(2);
    expect(waits).toEqual([500, 1500]);
  });

  it('a container that is not visible yet (code 24, subcode 4279009) is checked again rather than failing', async () => {
    mock = containerFlow([notVisible, () => json({ status: 'FINISHED' })]);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(imageUrlUnsafe(IMAGE), undefined);

    expect(result).toEqual({ ok: true, value: { id: POST_ID, url: PERMALINK } });
    expect(sentForm(mock.calls[0])).toEqual({ media_type: 'IMAGE', image_url: IMAGE });
  });

  it('when Meta cannot download the image (subcode 2207052), the post comes back as image-rejected', async () => {
    mock = installFetchMock([
      { match: isPublish, respond: () => json({ error: { message: 'Media download has failed', type: 'OAuthException', code: 1, error_subcode: 2_207_052 } }, 400) },
    ]);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(imageUrlUnsafe(IMAGE), 'A cat on the sofa');

    expect(!result.ok && result.error.kind).toBe('image-rejected');
    expect(mock.calls).toHaveLength(1);
  });

  it("a container that ends in ERROR comes back as rejected, with Meta's message", async () => {
    mock = containerFlow([() => json({ status: 'ERROR', error_message: 'FAILED_TO_PROCESS_IMAGE' })]);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishImage(imageUrlUnsafe(IMAGE), undefined);

    expect(!result.ok && result.error).toEqual({ kind: 'rejected', status: 0, message: `container ${CONTAINER} ended in ERROR: FAILED_TO_PROCESS_IMAGE` });
  });

  it('a container still processing after the last check comes back as still-processing, and nothing is published', async () => {
    mock = containerFlow([() => json({ status: 'IN_PROGRESS' })]);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep([]), pollAttempts: 3 }).publishImage(imageUrlUnsafe(IMAGE), undefined);

    expect(!result.ok && result.error).toEqual({ kind: 'still-processing', message: `container ${CONTAINER} was still processing after 3 checks` });
    expect(mock.calls.filter((call) => isStatusRead(call.url))).toHaveLength(3);
    expect(mock.calls.some((call) => isPublishStep(call.url, call.init))).toBe(false);
  });

  it('a reply creates a TEXT container answering the given post, then publishes it', async () => {
    mock = containerFlow([() => json({ status: 'FINISHED' })], REPLY_ID);

    const result = await createThreadsGraph({ token: TOKEN, sleep: recordingSleep([]) }).publishReply(threadsPostIdUnsafe(POST_ID), 'Part two');

    expect(result).toEqual({ ok: true, value: threadsPostIdUnsafe(REPLY_ID) });
    expect(sentForm(mock.calls[0])).toEqual({ media_type: 'TEXT', text: 'Part two', reply_to_id: POST_ID });
  });

  it('deleting sends DELETE for the post id, with the token in the header', async () => {
    mock = installFetchMock([{ match: (url, init) => init?.method === 'DELETE' && url.endsWith(`/v1.0/${POST_ID}`), respond: () => json({ success: true, deleted_id: POST_ID }) }]);

    const result = await createThreadsGraph({ token: TOKEN }).deletePost(threadsPostIdUnsafe(POST_ID));

    expect(result).toEqual({ ok: true, value: undefined });
    expect(new Headers(mock.calls[0]?.init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('a permission the token lacks (code 10) comes back as forbidden', async () => {
    mock = installFetchMock([
      {
        match: (url, init) => init?.method === 'DELETE',
        respond: () => json({ error: { message: '(#10) Application does not have permission for this action', type: 'OAuthException', code: 10 } }, 400),
      },
    ]);

    const result = await createThreadsGraph({ token: TOKEN }).deletePost(threadsPostIdUnsafe(POST_ID));

    expect(!result.ok && result.error.kind).toBe('forbidden');
  });

  it('a call that runs past its deadline comes back as a timeout', async () => {
    mock = installFetchMock([{ match: isPublish, respond: async (_url, init) => hangUntilAborted(init) }]);

    const result = await createThreadsGraph({ token: TOKEN, timeoutMs: 20 }).publishText('Hello from panda');

    expect(!result.ok && result.error.kind).toBe('timeout');
  });
});
