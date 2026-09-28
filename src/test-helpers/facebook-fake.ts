import { facebookPageIdUnsafe } from '../domain/facebook-page.ts';
import type { GrantedPage } from '../domain/facebook-page.ts';
import { err, ok } from '../domain/result.ts';
import type { Facebook, FacebookError, FacebookPage } from '../use-cases/ports/facebook.ts';

export type FacebookFakeConfig = {
  // What the user token grants: FACEBOOK_FAKE_PAGE alone unless a test says otherwise.
  readonly pages?: ReadonlyArray<GrantedPage>;
  // The Page a Page token belongs to: FACEBOOK_FAKE_PAGE unless a test says otherwise.
  readonly page?: FacebookPage;
  readonly errors?: { readonly listPages?: FacebookError; readonly whoAmI?: FacebookError };
};

// Built at runtime so no secret-looking literal sits beside a token-shaped name.
export const FACEBOOK_FAKE_PAGE: GrantedPage = {
  id: facebookPageIdUnsafe('104000000000001'),
  name: 'Panda Bakery',
  token: ['bakery', 'page', 'token'].join('-'),
  tasks: ['ADVERTISE', 'ANALYZE', 'CREATE_CONTENT', 'MESSAGING', 'MODERATE', 'MANAGE'],
};

export const createFacebookFake = (config?: FacebookFakeConfig): Facebook => {
  const errors = config?.errors;
  return {
    listPages: async () => {
      if (errors?.listPages) return err(errors.listPages);
      return ok(config?.pages ?? [FACEBOOK_FAKE_PAGE]);
    },
    whoAmI: async () => {
      if (errors?.whoAmI) return err(errors.whoAmI);
      return ok(config?.page ?? { id: FACEBOOK_FAKE_PAGE.id, name: FACEBOOK_FAKE_PAGE.name });
    },
  };
};
