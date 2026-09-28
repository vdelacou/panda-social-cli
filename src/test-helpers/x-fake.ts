import { err, ok } from '../domain/result.ts';
import type { X, XAccount, XError } from '../use-cases/ports/x.ts';

export type XFakeConfig = {
  readonly account?: XAccount;
  readonly errors?: { readonly whoAmI?: XError };
};

const DEFAULT_ACCOUNT: XAccount = { userId: '1600000000000000000', username: 'fake', accessLevel: 'read-write' };

export const createXFake = (config?: XFakeConfig): X => ({
  whoAmI: async () => {
    if (config?.errors?.whoAmI) return err(config.errors.whoAmI);
    return ok(config?.account ?? DEFAULT_ACCOUNT);
  },
});
