import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';

export type Config = {
  readonly threadsToken: string;
  readonly logLevel: string;
};

export type ConfigError = {
  readonly code: 'missing-credentials';
  readonly message: string;
};

// The one place environment variables are read; everything else receives a Config.
export const readConfig = (env: Readonly<Record<string, string | undefined>>): Result<Config, ConfigError> => {
  const threadsToken = env['PANDA_SOCIAL_THREADS_TOKEN']?.trim() ?? '';
  if (threadsToken === '') return err({ code: 'missing-credentials', message: 'No Threads token is configured.' });
  return ok({ threadsToken, logLevel: env['PANDA_SOCIAL_LOG_LEVEL'] ?? 'warn' });
};
