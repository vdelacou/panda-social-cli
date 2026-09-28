import { describe, expect, it } from 'bun:test';
import { err, ok } from './result.ts';
import { parseXKeys } from './x-keys.ts';

describe('the four X keys', () => {
  it('four keys, one per line, are read in order, and spaces around each are dropped', () => {
    expect(parseXKeys(['  api-key ', 'api-secret', 'access-token', ' access-secret  '])).toEqual(
      ok({ apiKey: 'api-key', apiSecret: 'api-secret', accessToken: 'access-token', accessSecret: 'access-secret' })
    );
  });

  it('fewer than four, an empty one or one with a space inside is refused, naming what to paste', () => {
    expect(parseXKeys(['api-key', 'api-secret', 'access-token'])).toEqual(
      err({ kind: 'invalid-keys', message: 'Expected 4 values, one per line: API Key, API Key Secret, Access Token, Access Token Secret; got 3.' })
    );
    expect(parseXKeys(['api-key', '  ', 'access-token', 'access-secret'])).toEqual(err({ kind: 'invalid-keys', message: 'The API Key Secret is empty.' }));
    expect(parseXKeys(['api-key', 'api-secret', 'access token', 'access-secret'])).toEqual(
      err({ kind: 'invalid-keys', message: 'The Access Token has a space in it: paste it as one piece.' })
    );
  });
});
