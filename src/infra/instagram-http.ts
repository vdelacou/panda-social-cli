import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { InstagramError } from '../use-cases/ports/instagram.ts';
import { GRAPH_API_VERSION } from './graph-version.ts';
import { isRecord, parsed, recordField, stringField } from './json-body.ts';
import { thrownFailure } from './thrown-failure.ts';

export const INSTAGRAM_GRAPH_HOST = 'https://graph.instagram.com';
export const INSTAGRAM_GRAPH_BASE = `${INSTAGRAM_GRAPH_HOST}/${GRAPH_API_VERSION}`;

// Rule 29: every call carries a deadline, and nothing here retries.
const DEFAULT_TIMEOUT_MS = 10_000;

export type InstagramGraphConfig = {
  readonly token: string;
  readonly timeoutMs?: number;
  // The wait between container status checks; tests pass one that returns at once.
  readonly sleep?: (ms: number) => Promise<void>;
  readonly pollAttempts?: number;
};

type Kind = InstagramError['kind'];

// D32: Meta's own code sorts a failure as it does on Facebook (D25), 10 and 200-299 being
// permissions; the HTTP status speaks only when the code is none of these. D36: 9004, 36000,
// 36001 and 36003 are an image Instagram cannot use, 9 its publishing limit, 9007 a container
// not ready yet.
const BY_CODE: ReadonlyMap<number, Kind> = new Map<number, Kind>([
  [102, 'unauthorized'],
  [190, 'unauthorized'],
  [10, 'forbidden'],
  [4, 'rate-limited'],
  [17, 'rate-limited'],
  [32, 'rate-limited'],
  [613, 'rate-limited'],
  [9, 'rate-limited'],
  [9004, 'image-rejected'],
  [36_000, 'image-rejected'],
  [36_001, 'image-rejected'],
  [36_003, 'image-rejected'],
  [9007, 'still-processing'],
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
const classifyHttp = (status: number, text: string): InstagramError => {
  const body = parsed(text);
  const error = isRecord(body) ? recordField(body, 'error') : {};
  const message = stringField(error, 'message') ?? text;
  const kind = kindOfCode(error['code']) ?? BY_STATUS.get(status) ?? 'rejected';
  return kind === 'rejected' ? { kind, status, message } : { kind, message };
};

// The token rides in the header, never in the URL (rule 27): graph.instagram.com reads it
// there (probed 2026-09-28). `path` sits under the versioned base; the token refresh alone
// lives at the host root.
export const request = async (
  config: InstagramGraphConfig,
  path: string,
  init: RequestInit,
  base: string = INSTAGRAM_GRAPH_BASE
): Promise<Result<Readonly<Record<string, unknown>>, InstagramError>> => {
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) return err(classifyHttp(response.status, text));
    const body = parsed(text);
    return ok(isRecord(body) ? body : {});
  } catch (error) {
    return err(thrownFailure(error));
  }
};
