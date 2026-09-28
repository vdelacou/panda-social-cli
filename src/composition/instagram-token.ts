import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createInstagramGraph } from '../infra/instagram-graph.ts';
import type { InstagramTokenOrigin } from '../use-cases/instagram-status.ts';
import { createLoadInstagramToken, missingInstagramToken } from '../use-cases/load-instagram-token.ts';
import type { Logger } from '../use-cases/ports/logger.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { Config } from './env.ts';

export type ActiveInstagramToken = {
  readonly token: string;
  readonly origin: InstagramTokenOrigin;
};

// The environment variable wins, then the token saved by `setup instagram` for the profile,
// renewed first once it is 30 days old (D31).
export const resolveInstagramToken = async (config: Config, profile: ProfileName, logger: Logger): Promise<Result<ActiveInstagramToken, StepError>> => {
  if (config.instagramToken !== undefined) return ok({ token: config.instagramToken, origin: { source: 'environment' } });
  if (config.credentialsFile === undefined) return err(missingInstagramToken(profile));
  const loaded = await createLoadInstagramToken({
    store: createCredentialStoreFile(config.credentialsFile),
    instagramFor: (token) => createInstagramGraph({ token }),
    now: () => new Date(),
    logger,
  })({ profile });
  if (!loaded.ok) return loaded;
  return ok({ token: loaded.value.credentials.token, origin: { source: 'saved', ...loaded.value } });
};
