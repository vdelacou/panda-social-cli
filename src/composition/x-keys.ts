import { xCredentialsFor } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { XKeys } from '../domain/x-keys.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { XKeysOrigin } from '../use-cases/x-status.ts';
import type { Config } from './env.ts';

export type ActiveXKeys = {
  readonly keys: XKeys;
  readonly origin: XKeysOrigin;
};

const X_VARIABLES = [
  ['apiKey', 'PANDA_SOCIAL_X_API_KEY'],
  ['apiSecret', 'PANDA_SOCIAL_X_API_SECRET'],
  ['accessToken', 'PANDA_SOCIAL_X_ACCESS_TOKEN'],
  ['accessSecret', 'PANDA_SOCIAL_X_ACCESS_SECRET'],
] as const;

// D15: all four variables win over the saved keys; some of them is a mistake worth naming.
const fromEnvironment = (config: Config): Result<XKeys | undefined, StepError> => {
  const missing = X_VARIABLES.filter(([field]) => config.xKeys[field] === undefined).map(([, name]) => name);
  if (missing.length === X_VARIABLES.length) return ok(undefined);
  if (missing.length > 0) return err({ step: 'load', cause: 'incomplete-environment', message: `Some X variables are set, but not ${missing.join(' and ')}.` });
  const { apiKey = '', apiSecret = '', accessToken = '', accessSecret = '' } = config.xKeys;
  return ok({ apiKey, apiSecret, accessToken, accessSecret });
};

const missingKeys = (profile: ProfileName): StepError => ({ step: 'load', cause: 'missing-credentials', message: `No X keys are configured for the "${profile}" profile.` });

// The environment wins, then the keys `setup x` saved for the profile. Nothing refreshes them.
export const resolveXKeys = async (config: Config, profile: ProfileName): Promise<Result<ActiveXKeys, StepError>> => {
  const environment = fromEnvironment(config);
  if (!environment.ok) return environment;
  if (environment.value !== undefined) return ok({ keys: environment.value, origin: { source: 'environment' } });
  if (config.credentialsFile === undefined) return err(missingKeys(profile));
  const stored = await createCredentialStoreFile(config.credentialsFile).load();
  if (!stored.ok) return err({ step: 'load', cause: stored.error.kind, message: stored.error.message });
  const saved = xCredentialsFor(stored.value, profile);
  if (saved === undefined) return err(missingKeys(profile));
  const { apiKey, apiSecret, accessToken, accessSecret, savedAt } = saved;
  return ok({ keys: { apiKey, apiSecret, accessToken, accessSecret }, origin: { source: 'saved', savedAt } });
};
