import { describe, expect, it } from 'bun:test';
import { err, ok } from './result.ts';
import { parseThreadsPostId, threadsPostId, threadsPostIdUnsafe } from './threads-post-id.ts';

describe('a Threads post id', () => {
  it('a numeric post id is accepted, and anything else is refused before it can reach a Threads URL', () => {
    expect(parseThreadsPostId('17890000000000001')).toEqual(ok(threadsPostIdUnsafe('17890000000000001')));
    expect(threadsPostId('17890000000000001')).toBe(threadsPostIdUnsafe('17890000000000001'));

    for (const raw of ['', 'me', '123abc', '../me', '12 34', '-5']) {
      expect(parseThreadsPostId(raw)).toEqual(err({ kind: 'invalid-post-id', message: `Not a Threads post id: "${raw}".` }));
      expect(() => threadsPostId(raw)).toThrow(`Not a Threads post id: "${raw}".`);
    }
  });
});
