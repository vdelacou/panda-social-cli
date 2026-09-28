import { describe, expect, it } from 'bun:test';
import { facebookPageIdUnsafe, parseFacebookPageId } from './facebook-page.ts';
import { err, ok } from './result.ts';

describe('a Facebook Page id', () => {
  it('a Page id is digits only: "104000000000001" is one, and "", "12a", "../feed" and "../104000000000001" are refused as invalid-page-id before they can reach a Graph URL', () => {
    expect(parseFacebookPageId('104000000000001')).toEqual(ok(facebookPageIdUnsafe('104000000000001')));

    for (const raw of ['', '12a', '../feed', '../104000000000001']) {
      expect(parseFacebookPageId(raw)).toEqual(err({ kind: 'invalid-page-id', message: `Not a Facebook Page id: "${raw}".` }));
    }
  });
});
