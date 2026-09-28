// Threads' post limit, counted the way Meta counts it: every character once, except
// emojis, which count as their UTF-8 byte length (developers.facebook.com/docs/threads,
// POST /threads, `text`, checked 2026-09-28).
export const THREADS_TEXT_LIMIT = 500;

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{20E3}\u{FE0F}]/u;
const encoder = new TextEncoder();
// The default granularity is the grapheme: one user-perceived character, a flag or a family emoji included.
const segmenter = new Intl.Segmenter();

const graphemes = (text: string): ReadonlyArray<string> => Array.from(segmenter.segment(text), (piece) => piece.segment);

const graphemeLength = (grapheme: string): number => (EMOJI.test(grapheme) ? encoder.encode(grapheme).length : 1);

export const threadsTextLength = (text: string): number => graphemes(text).reduce((total, grapheme) => total + graphemeLength(grapheme), 0);

// The string index where the longest prefix within `limit` ends, on a grapheme boundary,
// so an emoji is never cut in half. Called on a text over the limit only; a first grapheme
// longer than the limit is taken whole, so every part moves the split forward.
const fittingEnd = (text: string, limit: number): number => {
  const pieces = graphemes(text);
  let used = 0;
  let end = 0;
  for (const grapheme of pieces) {
    used += graphemeLength(grapheme);
    if (used > limit) break;
    end += grapheme.length;
  }
  return Math.max(end, pieces[0].length);
};

// Preferred cut points, best first: a paragraph, a line, a sentence end, a word.
const SEPARATORS: ReadonlyArray<ReadonlyArray<string>> = [['\n\n'], ['\n'], ['. ', '! ', '? '], [' ']];

// Where a part would end after the last `separator` in the window; 0 when there is none,
// or only one at the very start, which would leave an empty part.
const lastCut = (window: string, separator: string): number => {
  const at = window.lastIndexOf(separator);
  return at > 0 ? at + separator.length : 0;
};

// The window reaches one character past the prefix, so whitespace right after it counts
// as a cut point: it is trimmed away and never pushes the part over the limit.
const breakWithin = (window: string): number | undefined => {
  for (const separators of SEPARATORS) {
    const cut = Math.max(...separators.map((separator) => lastCut(window, separator)));
    if (cut > 0) return cut;
  }
  return undefined;
};

// Greedy: each part takes as much text as fits, cut at the best separator inside it.
export const splitForThreads = (text: string, limit: number = THREADS_TEXT_LIMIT): ReadonlyArray<string> => {
  const parts: string[] = [];
  let rest = text.trim();
  while (threadsTextLength(rest) > limit) {
    const end = fittingEnd(rest, limit);
    const cut = breakWithin(rest.slice(0, end + 1)) ?? end;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return rest === '' ? parts : [...parts, rest];
};
