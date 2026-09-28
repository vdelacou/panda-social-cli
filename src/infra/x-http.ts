import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { formatError } from '../domain/utilities/format-error.ts';
import type { XError } from '../use-cases/ports/x.ts';
import type { XSigner } from './x-signer.ts';

export const X_API_BASE = 'https://api.x.com';

// Rule 29: every call carries a deadline. A publish that timed out may have gone out,
// so nothing here retries.
const DEFAULT_TIMEOUT_MS = 10_000;

export type XHttpConfig = {
  readonly sign: XSigner;
  readonly timeoutMs?: number;
};

export type XAnswer = {
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers: Headers;
};

// X answers a 403 with this detail when the keys were made while the app was read-only.
const READ_ONLY_KEYS = /oauth1 app permissions/i;

const classifyHttp = (status: number, body: string): XError => {
  if (status === 401) return { kind: 'unauthorized', message: body };
  if (status === 402) return { kind: 'credits-depleted', message: body };
  if (status === 403) return { kind: READ_ONLY_KEYS.test(body) ? 'read-only-keys' : 'forbidden', message: body };
  if (status === 429) return { kind: 'rate-limited', message: body };
  return { kind: 'rejected', status, message: body };
};

const isTimeout = (error: unknown): boolean => error instanceof DOMException && error.name === 'TimeoutError';

const classifyThrown = (error: unknown): XError => {
  if (isTimeout(error)) return { kind: 'timeout', message: formatError(error) };
  return { kind: 'network-failed', message: formatError(error) };
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const request = async (config: XHttpConfig, method: string, path: string): Promise<Result<XAnswer, XError>> => {
  const url = `${X_API_BASE}${path}`;
  try {
    const response = await fetch(url, { method, headers: { authorization: config.sign({ method, url }) }, signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS) });
    const text = await response.text();
    if (!response.ok) return err(classifyHttp(response.status, text));
    const body: unknown = JSON.parse(text);
    return ok({ body: isRecord(body) ? body : {}, headers: response.headers });
  } catch (error) {
    return err(classifyThrown(error));
  }
};

export const recordField = (body: Readonly<Record<string, unknown>>, field: string): Readonly<Record<string, unknown>> => {
  const value = body[field];
  return isRecord(value) ? value : {};
};

export const stringField = (body: Readonly<Record<string, unknown>>, field: string): string | undefined => {
  const value = body[field];
  return typeof value === 'string' ? value : undefined;
};
