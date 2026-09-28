import { createHmac } from 'node:crypto';
import OAuth from 'oauth-1.0a';
import type { XKeys } from '../domain/x-keys.ts';

// D9 and D12: the one place X requests are signed, with a vetted OAuth 1.0a library over
// node:crypto's HMAC-SHA1 (rule 33). Swapping to OAuth 2.0 later replaces this module only.
// A JSON body is not part of an OAuth 1.0a signature; the query string is.
export type XSigner = (request: { readonly method: string; readonly url: string }) => string;

export const createXSigner = (keys: XKeys): XSigner => {
  const oauth = new OAuth({
    consumer: { key: keys.apiKey, secret: keys.apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function: (base, key) => createHmac('sha1', key).update(base).digest('base64'),
  });
  const token = { key: keys.accessToken, secret: keys.accessSecret };
  return (request) => oauth.toHeader(oauth.authorize({ url: request.url, method: request.method }, token)).Authorization;
};
