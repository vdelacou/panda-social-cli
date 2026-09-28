import { formatError } from '../domain/utilities/format-error.ts';
import type { XError } from '../use-cases/ports/x.ts';
import { isRecord, parsed, stringField } from './x-json.ts';

// X answers a 403 with these details when the keys were made while the app was read-only,
// and when a text repeats one of the account's recent posts.
const READ_ONLY_KEYS = /oauth1 app permissions/i;
const DUPLICATE_TEXT = /duplicate content/i;

const firstError = (body: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => {
  const errors = body['errors'];
  return Array.isArray(errors) && isRecord(errors[0]) ? errors[0] : {};
};

// X's reason in its own words (D20): the first error's message, else the problem's detail,
// else a message or a title; the raw text when the body is not JSON.
const reasonOf = (text: string): string => {
  const body = parsed(text);
  if (!isRecord(body)) return text;
  return stringField(firstError(body), 'message') ?? stringField(body, 'detail') ?? stringField(body, 'message') ?? stringField(body, 'title') ?? text;
};

const forbiddenKind = (text: string): 'read-only-keys' | 'duplicate-text' | 'forbidden' => {
  if (READ_ONLY_KEYS.test(text)) return 'read-only-keys';
  if (DUPLICATE_TEXT.test(text)) return 'duplicate-text';
  return 'forbidden';
};

export const classifyHttp = (status: number, text: string): XError => {
  const message = reasonOf(text);
  if (status === 401) return { kind: 'unauthorized', message };
  if (status === 402) return { kind: 'credits-depleted', message };
  if (status === 403) return { kind: forbiddenKind(text), message };
  if (status === 429) return { kind: 'rate-limited', message };
  return { kind: 'rejected', status, message };
};

const isTimeout = (error: unknown): boolean => error instanceof DOMException && error.name === 'TimeoutError';

export const classifyThrown = (error: unknown): XError => {
  if (isTimeout(error)) return { kind: 'timeout', message: formatError(error) };
  return { kind: 'network-failed', message: formatError(error) };
};
