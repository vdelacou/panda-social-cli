import { splitToFit } from './split-text.ts';
import { graphemes, isEmoji, totalWeight } from './text-units.ts';
import type { WeightedUnit } from './text-units.ts';

// X's post limit, counted as twitter-text's config v3 counts it (D13): after NFC, a code
// point in these ranges weighs 1 and any other 2, an emoji 2, and a link 23 however long.
export const X_TEXT_LIMIT = 280;

const LINK_WEIGHT = 23;

const LIGHT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

const codePointWeight = (codePoint: number): number => (LIGHT_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end) ? 1 : 2);

const graphemeWeight = (grapheme: string): number => (isEmoji(grapheme) ? 2 : [...grapheme].reduce((total, char) => total + codePointWeight(char.codePointAt(0) ?? 0), 0));

const graphemeUnits = (text: string): ReadonlyArray<WeightedUnit> => graphemes(text).map((grapheme) => ({ text: grapheme, weight: graphemeWeight(grapheme) }));

// A link as X reads one: http(s):// up to the next space.
const LINK = /https?:\/\/\S+/iu;
// A link ends on a letter, a digit or one of these; the punctuation after it is text.
const LINK_END = /[\p{L}\p{N}=_#/+-]/u;

// The scheme's slashes are link ends, so the loop always stops inside the scheme at worst.
const withoutTrailingPunctuation = (candidate: string): string => {
  let end = candidate.length;
  while (!LINK_END.test(candidate.charAt(end - 1))) end -= 1;
  return candidate.slice(0, end);
};

// X links only real domains: an address whose host has no dot, such as https://intranet/page, stays text.
const hasDottedHost = (link: string): boolean =>
  link
    .slice(link.indexOf('//') + 2)
    .split(/[/?#]/u, 1)[0]
    .includes('.');

// Plain graphemes around the links, each link one unit of 23.
const xUnits = (text: string): ReadonlyArray<WeightedUnit> => {
  const found = LINK.exec(text);
  if (found === null) return graphemeUnits(text);
  const link = withoutTrailingPunctuation(found[0]);
  const linkUnits: ReadonlyArray<WeightedUnit> = hasDottedHost(link) ? [{ text: link, weight: LINK_WEIGHT }] : graphemeUnits(link);
  return [...graphemeUnits(text.slice(0, found.index)), ...linkUnits, ...xUnits(text.slice(found.index + link.length))];
};

export const xTextLength = (text: string): number => totalWeight(xUnits(text.normalize('NFC')));

// The parts come back NFC-normalised, the form X counts.
export const splitForX = (text: string): ReadonlyArray<string> => splitToFit(text.normalize('NFC'), X_TEXT_LIMIT, xUnits);
