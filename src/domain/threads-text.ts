import { splitToFit } from './split-text.ts';
import { graphemes, isEmoji, totalWeight } from './text-units.ts';
import type { WeightedUnit } from './text-units.ts';

// Threads' post limit, counted the way Meta counts it: every character once, except
// emojis, which count as their UTF-8 byte length (developers.facebook.com/docs/threads,
// POST /threads, `text`, checked 2026-09-28).
export const THREADS_TEXT_LIMIT = 500;

const encoder = new TextEncoder();

const threadsUnits = (text: string): ReadonlyArray<WeightedUnit> =>
  graphemes(text).map((grapheme) => ({ text: grapheme, weight: isEmoji(grapheme) ? encoder.encode(grapheme).length : 1 }));

export const threadsTextLength = (text: string): number => totalWeight(threadsUnits(text));

export const splitForThreads = (text: string, limit: number = THREADS_TEXT_LIMIT): ReadonlyArray<string> => splitToFit(text, limit, threadsUnits);
