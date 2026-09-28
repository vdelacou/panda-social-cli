import type { CredentialsFile } from '../../domain/credentials.ts';
import type { Result } from '../../domain/result.ts';

export type CredentialStoreError =
  { readonly kind: 'unreadable'; readonly message: string } | { readonly kind: 'corrupt'; readonly message: string } | { readonly kind: 'write-failed'; readonly message: string };

// `update` reads, applies the change and writes back in one place, so no caller
// ever writes a file it did not just read.
export type CredentialStore = {
  readonly load: () => Promise<Result<CredentialsFile, CredentialStoreError>>;
  readonly update: (change: (current: CredentialsFile) => CredentialsFile) => Promise<Result<void, CredentialStoreError>>;
};
