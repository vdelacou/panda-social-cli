import { describe, expect, it } from 'bun:test';
import { err, ok } from './result.ts';
import { parseXPostId, xPostId, xPostIdUnsafe } from './x-post-id.ts';

describe('an X post id', () => {
  it('an X post id is 1 to 19 digits, and anything else is refused before it can reach an X URL', () => {
    for (const raw of ['1880000000000000001', '1234567890123456789', '7']) {
      expect(parseXPostId(raw)).toEqual(ok(xPostIdUnsafe(raw)));
      expect(xPostId(raw)).toBe(xPostIdUnsafe(raw));
    }

    for (const raw of ['', 'abc', '12 34', '../me', '-5', '12345678901234567890']) {
      expect(parseXPostId(raw)).toEqual(err({ kind: 'invalid-post-id', message: `Not an X post id: "${raw}".` }));
      expect(() => xPostId(raw)).toThrow(`Not an X post id: "${raw}".`);
    }
  });
});
