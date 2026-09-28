import { totalWeight } from './text-units.ts';
import type { WeightedUnit } from './text-units.ts';

// How a platform weighs a text, unit by unit (D19).
export type Weigh = (text: string) => ReadonlyArray<WeightedUnit>;

// The string index where the longest run of whole units within `limit` ends. Called on a
// text over the limit only; a first unit heavier than the limit is taken whole, so every
// part moves the split forward.
const fittingEnd = (units: ReadonlyArray<WeightedUnit>, limit: number): number => {
  let used = 0;
  let end = 0;
  for (const unit of units) {
    used += unit.weight;
    if (used > limit) break;
    end += unit.text.length;
  }
  return Math.max(end, units[0].text.length);
};

// Preferred cut points, best first: a paragraph, a line, a sentence end, a word.
const SEPARATORS: ReadonlyArray<ReadonlyArray<string>> = [['\n\n'], ['\n'], ['. ', '! ', '? '], [' ']];

// Where a part would end after the last `separator` in the window; 0 when there is none,
// or only one at the very start, which would leave an empty part.
const lastCut = (window: string, separator: string): number => {
  const at = window.lastIndexOf(separator);
  return at > 0 ? at + separator.length : 0;
};

// The window reaches one character past the run, so whitespace right after it counts as a
// cut point: it is trimmed away and never pushes the part over the limit.
const breakWithin = (window: string): number | undefined => {
  for (const separators of SEPARATORS) {
    const cut = Math.max(...separators.map((separator) => lastCut(window, separator)));
    if (cut > 0) return cut;
  }
  return undefined;
};

// Greedy: each part takes as much text as fits, cut at the best separator inside it.
export const splitToFit = (text: string, limit: number, weigh: Weigh): ReadonlyArray<string> => {
  const parts: string[] = [];
  let rest = text.trim();
  let units = weigh(rest);
  while (totalWeight(units) > limit) {
    const end = fittingEnd(units, limit);
    const cut = breakWithin(rest.slice(0, end + 1)) ?? end;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
    units = weigh(rest);
  }
  return rest === '' ? parts : [...parts, rest];
};
