import { withFacebookCredentials } from '../domain/credentials.ts';
import type { FacebookCredentials } from '../domain/credentials.ts';
import { choosePage } from '../domain/facebook-page.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { CredentialStore } from './ports/credential-store.ts';
import type { Facebook } from './ports/facebook.ts';
import type { StepError } from './ports/step-error.ts';

export type ConnectFacebookInput = {
  readonly profile: ProfileName;
  // The long-lived user token from the Access Token Debugger; it is never saved.
  readonly userToken: string;
  // The Page --page names; without it, the only Page the token grants.
  readonly pageId?: FacebookPageId;
};

export type ConnectFacebookSummary = {
  readonly platform: 'facebook';
  readonly profile: ProfileName;
  readonly pageId: FacebookPageId;
  readonly pageName: string;
};

export type ConnectFacebook = (input: ConnectFacebookInput) => Promise<Result<ConnectFacebookSummary, StepError>>;

export type ConnectFacebookDeps = {
  readonly facebookFor: (token: string) => Facebook;
  readonly store: CredentialStore;
  readonly now: () => Date;
};

// D21: the user token only lists the Pages it grants; what is saved is the chosen Page's own
// token, which does not expire, once Meta has handed it over.
export const createConnectFacebook =
  (deps: ConnectFacebookDeps): ConnectFacebook =>
  async (input) => {
    const pages = await deps.facebookFor(input.userToken).listPages();
    if (!pages.ok) return err({ step: 'verify', cause: pages.error.kind, message: pages.error.message });
    const page = choosePage(pages.value, input.pageId);
    if (!page.ok) return err({ step: 'choose', cause: page.error.kind, message: page.error.message });
    const { id, name, token } = page.value;
    const credentials: FacebookCredentials = { pageId: id, pageName: name, token, savedAt: deps.now().toISOString() };
    const saved = await deps.store.update((current) => withFacebookCredentials(current, input.profile, credentials));
    if (!saved.ok) return err({ step: 'save', cause: saved.error.kind, message: saved.error.message });
    return ok({ platform: 'facebook', profile: input.profile, pageId: id, pageName: name });
  };
