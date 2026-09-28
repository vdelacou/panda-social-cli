import { describe, expect, it } from 'bun:test';
import { instagramUserIdUnsafe, parseInstagramUserId } from './instagram-user-id.ts';
import { err, ok } from './result.ts';

describe('an Instagram account id', () => {
  it('a numeric account id is accepted, and anything else is refused before it can reach an Instagram URL', () => {
    expect(parseInstagramUserId('17841400000000001')).toEqual(ok(instagramUserIdUnsafe('17841400000000001')));

    for (const raw of ['', 'me', '../17841400000000001', '17841400000000001/media']) {
      expect(parseInstagramUserId(raw)).toEqual(err({ kind: 'invalid-user-id', message: `Not an Instagram account id: "${raw}".` }));
    }
  });
});
