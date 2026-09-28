import { describe, expect, it } from 'bun:test';
import { closestName } from './closest-name.ts';

const PLATFORMS: ReadonlyArray<string> = ['threads', 'x', 'facebook', 'instagram'];
const COMMANDS: ReadonlyArray<string> = ['post', 'update', 'delete', 'setup', 'status', 'help-json', 'docs'];
const UPDATE_OPTIONS: ReadonlyArray<string> = ['on', 'id', 'text', 'profile', 'image', 'split', 'repost'];

describe('the name a mistyped one was meant to be', () => {
  it('a name in other letter case is that name: "Threads" is threads, "X" is x', () => {
    expect([closestName('Threads', PLATFORMS), closestName('X', PLATFORMS)]).toEqual(['threads', 'x']);
  });

  it('one typo away is suggested: a letter missing ("thread"), added ("posts"), changed ("facebool") or swapped with its neighbour ("udpate")', () => {
    expect([closestName('thread', PLATFORMS), closestName('posts', COMMANDS), closestName('facebool', PLATFORMS), closestName('udpate', COMMANDS)]).toEqual([
      'threads',
      'post',
      'facebook',
      'update',
    ]);
  });

  it('the first three letters or more of one name are that name: "insta" is instagram, "help" is help-json', () => {
    expect([closestName('insta', PLATFORMS), closestName('help', COMMANDS)]).toEqual(['instagram', 'help-json']);
  });

  it('two typos are too far: "facebk" and "instgrm" suggest nothing', () => {
    expect([closestName('facebk', PLATFORMS), closestName('instgrm', PLATFORMS)]).toEqual([undefined, undefined]);
  });

  it('a name of one or two letters takes no typo: "z" is not x, and "di" is not id', () => {
    expect([closestName('z', PLATFORMS), closestName('di', UPDATE_OPTIONS)]).toEqual([undefined, undefined]);
  });

  it('two letters are too few to guess from: "up" suggests nothing', () => {
    expect(closestName('up', COMMANDS)).toBeUndefined();
  });

  it('a word close to two names suggests neither: "stat" between status and stats', () => {
    expect(closestName('stat', ['status', 'stats'])).toBeUndefined();
  });

  it('a word close to no name suggests nothing: "myspace", "twitter"', () => {
    expect([closestName('myspace', PLATFORMS), closestName('twitter', PLATFORMS)]).toEqual([undefined, undefined]);
  });
});
