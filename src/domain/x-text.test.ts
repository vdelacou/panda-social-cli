import { describe, expect, it } from 'bun:test';
import { splitForX, X_TEXT_LIMIT, xTextLength } from './x-text.ts';

const words = (text: string): ReadonlyArray<string> => text.split(/\s+/).filter((word) => word !== '');

describe('counting and splitting X text', () => {
  it('X counts most characters as 1, CJK characters and emoji as 2, and composes accents first', () => {
    expect(xTextLength('Hello')).toBe(5);
    expect(xTextLength('日本語')).toBe(6);
    expect(xTextLength('👍')).toBe(2);
    expect(xTextLength('👨‍👩‍👧‍👦')).toBe(2);
    expect(xTextLength('café')).toBe(4);
    expect(xTextLength('cafe\u{0301}')).toBe(4);
  });

  it('a link counts 23 however long it is, the punctuation after it counts as text, and an address with no dot in its host is plain text', () => {
    expect(xTextLength('Read https://example.com/a/long/path.')).toBe(29);
    expect(xTextLength('https://x.co')).toBe(23);
    expect(xTextLength('http://example.com')).toBe(23);
    expect(xTextLength('HTTPS://EXAMPLE.COM')).toBe(23);
    expect(xTextLength('(https://example.com/a)')).toBe(25);
    expect(xTextLength('https://intranet/page')).toBe(21);
  });

  it("the weights follow X's own ranges to the character: the first and last of each count 1, their neighbours outside count 2", () => {
    for (const light of ['\u{10FF}', '\u{2000}', '\u{200D}', '\u{2010}', '\u{201F}', '\u{2032}', '\u{2037}']) expect(xTextLength(light)).toBe(1);
    for (const heavy of ['\u{1100}', '\u{1FFF}', '\u{200E}', '\u{200F}', '\u{2020}', '\u{2031}', '\u{2038}']) expect(xTextLength(heavy)).toBe(2);
    expect(X_TEXT_LIMIT).toBe(280);
  });

  it('a long text splits for X within 280 counted characters, at a break, never inside a link, and keeps every word', () => {
    const link = `https://example.com/${'q'.repeat(100)}`;
    const text = Array.from({ length: 12 }, (_, index) => `Partie ${index + 1} : 日本語のテキスト and some words 🎬 to fill the line up.`).join('\n\n');

    const parts = splitForX(text);

    expect(splitForX(`${'b'.repeat(250)} ${link} ${'c'.repeat(100)}`)).toEqual([`${'b'.repeat(250)} ${link}`, 'c'.repeat(100)]);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => xTextLength(part) <= X_TEXT_LIMIT)).toBe(true);
    expect(words(parts.join(' '))).toEqual(words(text));
  });
});
