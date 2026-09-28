import path from 'node:path';

export type Config = {
  // PANDA_SOCIAL_THREADS_TOKEN: when set, it wins over the saved credentials.
  readonly threadsToken: string | undefined;
  // PANDA_SOCIAL_X_API_KEY, _API_SECRET, _ACCESS_TOKEN, _ACCESS_SECRET: all four win over the saved keys.
  readonly xKeys: {
    readonly apiKey: string | undefined;
    readonly apiSecret: string | undefined;
    readonly accessToken: string | undefined;
    readonly accessSecret: string | undefined;
  };
  // PANDA_SOCIAL_FACEBOOK_PAGE_ID and _PAGE_TOKEN: both win over the saved Page.
  readonly facebookPage: {
    readonly id: string | undefined;
    readonly token: string | undefined;
  };
  // PANDA_SOCIAL_INSTAGRAM_TOKEN: when set, it wins over the saved credentials.
  readonly instagramToken: string | undefined;
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
    xKeys: {
      apiKey: nonEmpty(env['PANDA_SOCIAL_X_API_KEY']),
      apiSecret: nonEmpty(env['PANDA_SOCIAL_X_API_SECRET']),
      accessToken: nonEmpty(env['PANDA_SOCIAL_X_ACCESS_TOKEN']),
      accessSecret: nonEmpty(env['PANDA_SOCIAL_X_ACCESS_SECRET']),
    },
    facebookPage: { id: nonEmpty(env['PANDA_SOCIAL_FACEBOOK_PAGE_ID']), token: nonEmpty(env['PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN']) },
    instagramToken: nonEmpty(env['PANDA_SOCIAL_INSTAGRAM_TOKEN']),
    logLevel: env['PANDA_SOCIAL_LOG_LEVEL'] ?? 'warn',
    credentialsFile: home === undefined ? undefined : path.join(home, '.panda-social', 'credentials.json'),
  };
};
