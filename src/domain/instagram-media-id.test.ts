import { describe, expect, it } from 'bun:test';
import { instagramMediaIdUnsafe, parseInstagramMediaId } from './instagram-media-id.ts';
import { err, ok } from './result.ts';

describe('an Instagram media id', () => {
  it('a numeric media id is accepted, and anything else is refused before it can reach an Instagram URL', () => {
    expect(parseInstagramMediaId('17900000000000001')).toEqual(ok(instagramMediaIdUnsafe('17900000000000001')));

    for (const raw of ['', 'abc', '../17900000000000001', '17900000000000001/comments']) {
      expect(parseInstagramMediaId(raw)).toEqual(err({ kind: 'invalid-post-id', message: `Not an Instagram post id: "${raw}".` }));
    }
  });
});
