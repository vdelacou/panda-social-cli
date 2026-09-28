import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XError } from '../use-cases/ports/x.ts';
import { classifyHttp, classifyThrown } from './x-failures.ts';
import { isRecord, parsed } from './x-json.ts';
import type { XSigner } from './x-signer.ts';

export const X_API_BASE = 'https://api.x.com';

// Rule 29: every call carries a deadline. A publish that timed out may have gone out,
// so nothing here retries.
const DEFAULT_TIMEOUT_MS = 10_000;

export type XHttpConfig = {
  readonly sign: XSigner;
  readonly timeoutMs?: number;
};

// One call: a JSON body when it sends one, and its own deadline when the default is too short.
export type XCall = {
  readonly method: string;
  readonly path: string;
  readonly json?: unknown;
  readonly timeoutMs?: number;
};

export type XAnswer = {
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers: Headers;
};

// The JSON body is not part of an OAuth 1.0a signature: only the method and the URL are signed.
const initOf = (config: XHttpConfig, call: XCall, url: string): RequestInit => ({
  method: call.method,
  headers: { authorization: config.sign({ method: call.method, url }), ...(call.json !== undefined && { 'content-type': 'application/json' }) },
  ...(call.json !== undefined && { body: JSON.stringify(call.json) }),
});

export const request = async (config: XHttpConfig, call: XCall): Promise<Result<XAnswer, XError>> => {
  const url = `${X_API_BASE}${call.path}`;
  try {
    const response = await fetch(url, { ...initOf(config, call, url), signal: AbortSignal.timeout(config.timeoutMs ?? call.timeoutMs ?? DEFAULT_TIMEOUT_MS) });
    const text = await response.text();
    if (!response.ok) return err(classifyHttp(response.status, text));
    const body = parsed(text);
    return ok({ body: isRecord(body) ? body : {}, headers: response.headers });
  } catch (error) {
    return err(classifyThrown(error));
  }
};
