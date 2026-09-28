import { describe, expect, it } from 'bun:test';
import { splitForThreads, THREADS_TEXT_LIMIT, threadsTextLength } from './threads-text.ts';

const words = (text: string): ReadonlyArray<string> => text.split(/\s+/).filter((word) => word !== '');

describe('counting and splitting Threads text', () => {
  it('letters, accented ones included, count 1 each, and an emoji counts its UTF-8 bytes (a thumbs-up is 4)', () => {
    expect(threadsTextLength('Hello')).toBe(5);
    expect(threadsTextLength('Séries télé')).toBe(11);
    expect(threadsTextLength('👍')).toBe(4);
    expect(threadsTextLength('❤️')).toBe(6);
    expect(threadsTextLength('1️⃣')).toBe(7);
    expect(threadsTextLength('Go 🇫🇷!')).toBe(12);
  });

  it('a text of exactly 500 counted characters stays one part, even with a space to split at', () => {
    const text = `${'a'.repeat(249)} ${'b'.repeat(250)}`;

    expect(THREADS_TEXT_LIMIT).toBe(500);
    expect(threadsTextLength(text)).toBe(THREADS_TEXT_LIMIT);
    expect(splitForThreads(text)).toEqual([text]);
  });

  it('a long text splits at the last paragraph break that fits, then a line break, a sentence end, then a space', () => {
    expect(splitForThreads('Short title\n\nA body line.\nMore words here and there until long.', 40)).toEqual([
      'Short title',
      'A body line.',
      'More words here and there until long.',
    ]);
    expect(splitForThreads('One sentence ends here. Another one keeps going past the limit.', 40)).toEqual(['One sentence ends here.', 'Another one keeps going past the limit.']);
    expect(splitForThreads('alpha beta gamma delta epsilon', 20)).toEqual(['alpha beta gamma', 'delta epsilon']);
    expect(splitForThreads('abc defghi jkl', 10)).toEqual(['abc defghi', 'jkl']);
  });

  it('a single word longer than the limit is cut hard, never inside an emoji', () => {
    expect(splitForThreads('abcdefghijklmnop', 10)).toEqual(['abcdefghij', 'klmnop']);
    expect(splitForThreads('abcdefgh👍xyz', 10)).toEqual(['abcdefgh', '👍xyz']);
    expect(splitForThreads('👍👍', 3)).toEqual(['👍', '👍']);
  });

  it('no part starts or ends with spaces, whether they surround the text or follow a sentence end', () => {
    expect(splitForThreads('  One.  Two.  ', 6)).toEqual(['One.', 'Two.']);
  });

  it('a sentence end at the very start of a part is no split point, so no part is a lone punctuation mark', () => {
    expect(splitForThreads('. ab cd', 5)).toEqual(['. ab', 'cd']);
  });

  it('every part stays within 500 counted characters, and the parts together keep every word of the original', () => {
    const text = Array.from({ length: 40 }, (_, index) => `Paragraphe ${index + 1} : une phrase de test avec des accents é à ç et un emoji 🎬.`).join('\n\n');

    const parts = splitForThreads(text);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => threadsTextLength(part) <= THREADS_TEXT_LIMIT)).toBe(true);
    expect(words(parts.join(' '))).toEqual(words(text));
  });
});
