import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// The four OAuth 1.0a values X's developer console generates for an app and its owner.
export type XKeys = {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly accessToken: string;
  readonly accessSecret: string;
};

export type XKeysError = { readonly kind: 'invalid-keys'; readonly message: string };

// The order a person copies them in, and the order `--keys-stdin` reads them.
export const X_KEY_NAMES: ReadonlyArray<string> = ['API Key', 'API Key Secret', 'Access Token', 'Access Token Secret'];

const invalid = (message: string): Result<never, XKeysError> => err({ kind: 'invalid-keys', message });

const refusal = (name: string, value: string): string | undefined => {
  if (value === '') return `The ${name} is empty.`;
  if (/\s/.test(value)) return `The ${name} has a space in it: paste it as one piece.`;
  return undefined;
};

export const parseXKeys = (values: ReadonlyArray<string>): Result<XKeys, XKeysError> => {
  if (values.length !== X_KEY_NAMES.length) return invalid(`Expected 4 values, one per line: ${X_KEY_NAMES.join(', ')}; got ${values.length}.`);
  const keys = values.map((value) => value.trim());
  const problem = keys.map((value, index) => refusal(X_KEY_NAMES[index], value)).find((message) => message !== undefined);
  if (problem !== undefined) return invalid(problem);
  const [apiKey, apiSecret, accessToken, accessSecret] = keys;
  return ok({ apiKey, apiSecret, accessToken, accessSecret });
};
