import { closestName } from '../domain/utilities/closest-name.ts';

// D41: the start of a hint, `Did you mean "threads"? `, when one known name is close to
// the typed one, and nothing otherwise. An option is shown with its dashes.
export const didYouMean = (typed: string, names: ReadonlyArray<string>, dashes = ''): string => {
  const name = closestName(typed, names);
  return name === undefined ? '' : `Did you mean "${dashes}${name}"? `;
};
