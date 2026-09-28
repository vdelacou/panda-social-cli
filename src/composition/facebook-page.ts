import { facebookCredentialsFor } from '../domain/credentials.ts';
import { parseFacebookPageId } from '../domain/facebook-page.ts';
import type { FacebookPageId } from '../domain/facebook-page.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import type { FacebookTokenOrigin } from '../use-cases/facebook-status.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { Config } from './env.ts';

export type ActiveFacebookPage = {
  readonly pageId: FacebookPageId;
  readonly token: string;
  readonly origin: FacebookTokenOrigin;
};

// A Page id from the environment or from a hand-editable file reaches URL paths only as digits.
const checkedId = (raw: string): Result<FacebookPageId, StepError> => {
  const id = parseFacebookPageId(raw);
  return id.ok ? id : err({ step: 'load', cause: id.error.kind, message: id.error.message });
};

// D23: both variables win over the saved Page; one of them alone is a mistake worth naming.
const fromEnvironment = (config: Config): Result<ActiveFacebookPage | undefined, StepError> => {
  const { id, token } = config.facebookPage;
  if (id === undefined && token === undefined) return ok(undefined);
  if (id === undefined || token === undefined) {
    const missing = id === undefined ? 'PANDA_SOCIAL_FACEBOOK_PAGE_ID' : 'PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN';
    return err({ step: 'load', cause: 'incomplete-environment', message: `Some Facebook variables are set, but not ${missing}.` });
  }
  const pageId = checkedId(id);
  return pageId.ok ? ok({ pageId: pageId.value, token, origin: { source: 'environment' } }) : pageId;
};

const missingPage = (profile: ProfileName): StepError => ({ step: 'load', cause: 'missing-credentials', message: `No Facebook Page is configured for the "${profile}" profile.` });

// The environment wins, then the Page `setup facebook` saved for the profile. Nothing refreshes it.
export const resolveFacebookPage = async (config: Config, profile: ProfileName): Promise<Result<ActiveFacebookPage, StepError>> => {
  const environment = fromEnvironment(config);
  if (!environment.ok) return environment;
  if (environment.value !== undefined) return ok(environment.value);
  if (config.credentialsFile === undefined) return err(missingPage(profile));
  const stored = await createCredentialStoreFile(config.credentialsFile).load();
  if (!stored.ok) return err({ step: 'load', cause: stored.error.kind, message: stored.error.message });
  const saved = facebookCredentialsFor(stored.value, profile);
  if (saved === undefined) return err(missingPage(profile));
  const pageId = checkedId(saved.pageId);
  return pageId.ok ? ok({ pageId: pageId.value, token: saved.token, origin: { source: 'saved', savedAt: saved.savedAt } }) : pageId;
};
