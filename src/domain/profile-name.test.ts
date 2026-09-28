import { describe, expect, it } from 'bun:test';
import { ok } from './result.ts';
import { parseProfileName, profileNameUnsafe } from './profile-name.ts';

describe('naming a credentials profile', () => {
  it('a profile named brand-a is accepted', () => {
    const fortyCharacters = 'a'.repeat(40);

    for (const name of ['brand-a', 'default', 'b', 'shop_2', fortyCharacters]) {
      expect(parseProfileName(name)).toEqual(ok(profileNameUnsafe(name)));
    }
  });

  it('a profile named __proto__ or Brand A is refused before it becomes a key in the credentials file', () => {
    const fortyOneCharacters = 'a'.repeat(41);

    for (const name of ['__proto__', 'Brand A', 'brand a', '-brand', '', fortyOneCharacters]) {
      const result = parseProfileName(name);
      expect(!result.ok && result.error).toEqual({ kind: 'invalid-profile', message: `Invalid profile name: "${name}".` });
    }
  });
});
