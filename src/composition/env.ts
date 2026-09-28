import path from 'node:path';

export type Config = {
  // PANDA_SOCIAL_THREADS_TOKEN: when set, it wins over the saved credentials.
  readonly threadsToken: string | undefined;
  readonly logLevel: string;
  // <home>/.panda-social/credentials.json, or undefined when no home folder is known.
  readonly credentialsFile: string | undefined;
};

const nonEmpty = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? undefined : trimmed;
};

// The one place environment variables are read; everything else receives a Config.
export const readConfig = (env: Readonly<Record<string, string | undefined>>): Config => {
  const home = nonEmpty(env['HOME']) ?? nonEmpty(env['USERPROFILE']);
  return {
    threadsToken: nonEmpty(env['PANDA_SOCIAL_THREADS_TOKEN']),
    logLevel: env['PANDA_SOCIAL_LOG_LEVEL'] ?? 'warn',
    credentialsFile: home === undefined ? undefined : path.join(home, '.panda-social', 'credentials.json'),
  };
};
