import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { CredentialsFile } from '../domain/credentials.ts';
import { err, ok } from '../domain/result.ts';
import type { CredentialStore, CredentialStoreError } from '../use-cases/ports/credential-store.ts';

export type CredentialStoreFake = CredentialStore & {
  readonly current: () => CredentialsFile;
};

export type CredentialStoreFakeConfig = {
  readonly initial?: CredentialsFile;
  readonly errors?: { readonly load?: CredentialStoreError; readonly update?: CredentialStoreError };
};

export const createCredentialStoreFake = (config?: CredentialStoreFakeConfig): CredentialStoreFake => {
  let file = config?.initial ?? EMPTY_CREDENTIALS;
  return {
    current: () => file,
    load: async () => {
      if (config?.errors?.load) return err(config.errors.load);
      return ok(file);
    },
    update: async (change) => {
      if (config?.errors?.update) return err(config.errors.update);
      file = change(file);
      return ok(undefined);
    },
  };
};
