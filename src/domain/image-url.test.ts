import { describe, expect, it } from 'bun:test';
import { imageUrlUnsafe, parseImageUrl } from './image-url.ts';
import { ok } from './result.ts';

describe('an image URL for Threads', () => {
  it('an https image URL is accepted', () => {
    expect(parseImageUrl('https://cdn.example.com/cat.jpg')).toEqual(ok(imageUrlUnsafe('https://cdn.example.com/cat.jpg')));
  });

  it('a local path, an http URL or a URL with credentials is refused', () => {
    for (const raw of [
      './cat.jpg',
      '/home/me/cat.jpg',
      'http://cdn.example.com/cat.jpg',
      'https://user:secret@cdn.example.com/cat.jpg',
      'https://user@cdn.example.com/cat.jpg',
      'https://:secret@cdn.example.com/cat.jpg',
      '',
    ]) {
      const result = parseImageUrl(raw);

      expect(!result.ok && result.error).toEqual({ kind: 'invalid-image', message: `Not a public https image URL: "${raw}".` });
    }
  });
});
