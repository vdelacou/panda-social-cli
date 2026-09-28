import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { FacebookError } from '../use-cases/ports/facebook.ts';
import { isRecord, parsed, recordField, stringField } from './json-body.ts';
import { thrownFailure } from './thrown-failure.ts';

export const FACEBOOK_GRAPH_BASE = 'https://graph.facebook.com/v26.0';

// Rule 29: every call carries a deadline. A publish that timed out may have gone out, so
// nothing here retries.
const DEFAULT_TIMEOUT_MS = 10_000;

export type FacebookGraphConfig = {
  readonly token: string;
  readonly timeoutMs?: number;
};

type Kind = FacebookError['kind'];

// D25: Meta's own code sorts a failure (10 and 200-299 are permissions); the HTTP status
// speaks only when the code is none of these, as for a body that is not Meta's JSON. D29: 324
// is an image Meta cannot use, 506 a text that repeats a recent post.
const BY_CODE: ReadonlyMap<number, Kind> = new Map<number, Kind>([
  [102, 'unauthorized'],
  [190, 'unauthorized'],
  [10, 'forbidden'],
  [4, 'rate-limited'],
  [17, 'rate-limited'],
  [32, 'rate-limited'],
  [613, 'rate-limited'],
  [324, 'image-rejected'],
  [506, 'duplicate-text'],
]);
const BY_STATUS: ReadonlyMap<number, Kind> = new Map<number, Kind>([
  [401, 'unauthorized'],
  [403, 'forbidden'],
  [429, 'rate-limited'],
]);

const kindOfCode = (code: unknown): Kind | undefined => {
  if (typeof code !== 'number') return undefined;
  if (code >= 200 && code <= 299) return 'forbidden';
  return BY_CODE.get(code);
};

// Meta's reason in its own words: `{"error":{"message","type","code","error_subcode"}}`.
const classifyHttp = (status: number, text: string): FacebookError => {
  const body = parsed(text);
  const error = isRecord(body) ? recordField(body, 'error') : {};
  const message = stringField(error, 'message') ?? text;
  const kind = kindOfCode(error['code']) ?? BY_STATUS.get(status) ?? 'rejected';
  return kind === 'rejected' ? { kind, status, message } : { kind, message };
};

// The token rides in the header, never in the URL (rule 27): graph.facebook.com reads it
// there (a dummy token answered code 190, no token code 2500, 2026-09-28). A form body sets
// its own content type. An upload passes a longer deadline than the default.
export const request = async (
  config: FacebookGraphConfig,
  path: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Result<Readonly<Record<string, unknown>>, FacebookError>> => {
  try {
    const response = await fetch(`${FACEBOOK_GRAPH_BASE}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(config.timeoutMs ?? timeoutMs),
    });
    const text = await response.text();
    if (!response.ok) return err(classifyHttp(response.status, text));
    const body = parsed(text);
    return ok(isRecord(body) ? body : {});
  } catch (error) {
    return err(thrownFailure(error));
  }
};
