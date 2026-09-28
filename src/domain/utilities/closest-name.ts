/*
 * The known name a mistyped one was most likely meant to be, for a did-you-mean hint
 * (D41): the same name in other letter case, a name one typo away, or the one name the
 * typed word begins. A word close to two names gets neither, since a guess could mislead.
 */

// Every way to leave one letter out of a word.
const withOneLeftOut = (word: string): ReadonlyArray<string> => Array.from({ length: word.length }, (_, index) => word.slice(0, index) + word.slice(index + 1));

// Every way to swap a letter with the next one.
const withOneSwapped = (word: string): ReadonlyArray<string> =>
  Array.from({ length: word.length }, (_, index) => word.slice(0, index) + word.charAt(index + 1) + word.charAt(index) + word.slice(index + 2));

// One typo apart: a letter missing, added, changed (the two words match once the same
// letter leaves both), or swapped with its neighbour.
const isOneTypo = (word: string, name: string): boolean => {
  const nameLeftOut = withOneLeftOut(name);
  const wordLeftOut = withOneLeftOut(word);
  return nameLeftOut.includes(word) || wordLeftOut.includes(name) || wordLeftOut.some((shorter, index) => shorter === nameLeftOut[index]) || withOneSwapped(word).includes(name);
};

// A name of one or two letters is too short to guess a typo from, and two typed letters
// are too few to guess the rest of a name from.
const isClose = (word: string, name: string): boolean => word === name || (name.length > 2 && isOneTypo(word, name)) || (word.length > 2 && name.startsWith(word));

export const closestName = (typed: string, names: ReadonlyArray<string>): string | undefined => {
  const word = typed.toLowerCase();
  const close = names.filter((name) => isClose(word, name));
  return close.length === 1 ? close[0] : undefined;
};
