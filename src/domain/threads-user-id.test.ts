import { describe, expect, it } from 'bun:test';
import { err, ok } from './result.ts';
import { parseThreadsUserId, threadsUserIdUnsafe } from './threads-user-id.ts';

describe('a Threads user id', () => {
  it('a numeric user id is accepted, and anything else is refused before it can reach a Threads URL', () => {
    expect(parseThreadsUserId('26000000000000001')).toEqual(ok(threadsUserIdUnsafe('26000000000000001')));

    for (const raw of ['', 'me', '../26000000000000001', '26000000000000001/threads']) {
      expect(parseThreadsUserId(raw)).toEqual(err({ kind: 'invalid-user-id', message: `Not a Threads user id: "${raw}".` }));
    }
  });
});
