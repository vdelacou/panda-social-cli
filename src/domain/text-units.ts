// A piece of text that is never cut in two, and what it weighs against a platform's limit:
// a grapheme (one user-perceived character, a flag or a family emoji included), or on X a
// whole link.
export type WeightedUnit = {
  readonly text: string;
  readonly weight: number;
};

// The default granularity is the grapheme.
const segmenter = new Intl.Segmenter();

export const graphemes = (text: string): ReadonlyArray<string> => Array.from(segmenter.segment(text), (piece) => piece.segment);

const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{20E3}\u{FE0F}]/u;

export const isEmoji = (grapheme: string): boolean => EMOJI.test(grapheme);

export const totalWeight = (units: ReadonlyArray<WeightedUnit>): number => units.reduce((total, unit) => total + unit.weight, 0);
