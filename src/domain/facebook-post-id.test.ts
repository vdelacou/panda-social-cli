import { describe, expect, it } from 'bun:test';
import { facebookPostIdUnsafe, parseFacebookPostId } from './facebook-post-id.ts';
import { err, ok } from './result.ts';

describe('a Facebook post id', () => {
  it('a post id is the Page id and the post number joined by an underscore, and anything else is refused as invalid-post-id before it can reach a Graph URL', () => {
    expect(parseFacebookPostId('104000000000001_122000000000001')).toEqual(ok(facebookPostIdUnsafe('104000000000001_122000000000001')));

    for (const raw of ['', '122000000000001', '104000000000001_', '_122000000000001', 'abc_122', '104000000000001_1/comments']) {
      expect(parseFacebookPostId(raw)).toEqual(err({ kind: 'invalid-post-id', message: `Not a Facebook post id: "${raw}".` }));
    }
  });
});
