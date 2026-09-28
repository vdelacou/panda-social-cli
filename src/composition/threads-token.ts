import { threadsCredentialsFor } from '../domain/credentials.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { createCredentialStoreFile } from '../infra/credential-store-file.ts';
import type { Failure } from '../presenter/cli.ts';
import { hintFor } from '../presenter/hints.ts';
import type { Config } from './env.ts';

const missing = (profile: ProfileName): Failure => ({
  code: 'missing-credentials',
  message: `No Threads token is configured for the "${profile}" profile.`,
  hint: hintFor('missing-credentials'),
});

// The environment variable wins, then the token saved by `setup threads` for the profile.
export const resolveThreadsToken = async (config: Config, profile: ProfileName): Promise<Result<string, Failure>> => {
  if (config.threadsToken !== undefined) return ok(config.threadsToken);
  if (config.credentialsFile === undefined) return err(missing(profile));
  const stored = await createCredentialStoreFile(config.credentialsFile).load();
  if (!stored.ok) return err({ code: stored.error.kind, message: stored.error.message, hint: hintFor(stored.error.kind) });
  const credentials = threadsCredentialsFor(stored.value, profile);
  if (credentials === undefined) return err(missing(profile));
  return ok(credentials.token);
};
