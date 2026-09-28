import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import { createThreadsGraph } from '../infra/threads-graph.ts';
import { createLoadThreadsToken, missingThreadsToken } from '../use-cases/load-threads-token.ts';
import type { Logger } from '../use-cases/ports/logger.ts';
import type { StepError } from '../use-cases/ports/step-error.ts';
import type { TokenOrigin } from '../use-cases/threads-status.ts';
import type { Config } from './env.ts';

export type ActiveThreadsToken = {
  readonly token: string;
  readonly origin: TokenOrigin;
};

// The environment variable wins, then the token saved by `setup threads` for the profile,
// refreshed first once it is 30 days old.
export const resolveThreadsToken = async (config: Config, profile: ProfileName, logger: Logger): Promise<Result<ActiveThreadsToken, StepError>> => {
  if (config.threadsToken !== undefined) return ok({ token: config.threadsToken, origin: { source: 'environment' } });
  if (config.credentialsFile === undefined) return err(missingThreadsToken(profile));
  const loaded = await createLoadThreadsToken({
    store: createCredentialStoreFile(config.credentialsFile),
    threadsFor: (token) => createThreadsGraph({ token }),
    now: () => new Date(),
    logger,
  })({ profile });
  if (!loaded.ok) return loaded;
  return ok({ token: loaded.value.credentials.token, origin: { source: 'saved', ...loaded.value } });
};
