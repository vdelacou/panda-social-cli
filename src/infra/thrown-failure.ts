import { formatError } from '../domain/utilities/format-error.ts';

// A call that got no answer, on any platform: its own deadline ran out (rule 29), or the
// network failed.
export type ThrownFailure = { readonly kind: 'timeout' | 'network-failed'; readonly message: string };

const isTimeout = (error: unknown): boolean => error instanceof DOMException && error.name === 'TimeoutError';

export const thrownFailure = (error: unknown): ThrownFailure => ({ kind: isTimeout(error) ? 'timeout' : 'network-failed', message: formatError(error) });
