import os from 'node:os';
import path from 'node:path';
import { isRecord, parseJson, pick } from './answer.ts';

// Empty or blank counts as absent, and a value is trimmed, as the CLI reads the environment.
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);

// The credentials file setup writes on this machine, found the way the CLI finds it (D8).
const credentialsFile = (): string => path.join(text(process.env['HOME']) ?? text(process.env['USERPROFILE']) ?? os.homedir(), '.panda-social', 'credentials.json');

// One platform's saved credentials in one profile, or undefined when setup never saved them.
export const savedCredentials = async (profile: string, platform: string): Promise<Readonly<Record<string, unknown>> | undefined> => {
  const file = Bun.file(credentialsFile());
  if (!(await file.exists())) return undefined;
  const saved = pick(parseJson(await file.text()), 'profiles', profile, platform);
  return isRecord(saved) ? saved : undefined;
};

// A probe's Threads or Instagram token: the environment variable when set, as the CLI reads it, else the saved one.
export const tokenOf = async (profile: string, platform: 'threads' | 'instagram'): Promise<string | undefined> =>
  text(process.env[`PANDA_SOCIAL_${platform.toUpperCase()}_TOKEN`]) ?? text(pick(await savedCredentials(profile, platform), 'token'));

export type Page = { readonly pageId: string; readonly token: string };

// The Facebook Page and its token: both environment variables, or the saved Page.
export const pageOf = async (profile: string): Promise<Page | undefined> => {
  const pageId = text(process.env['PANDA_SOCIAL_FACEBOOK_PAGE_ID']);
  const token = text(process.env['PANDA_SOCIAL_FACEBOOK_PAGE_TOKEN']);
  if (pageId !== undefined && token !== undefined) return { pageId, token };
  const saved = await savedCredentials(profile, 'facebook');
  const savedId = text(pick(saved, 'pageId'));
  const savedToken = text(pick(saved, 'token'));
  return savedId === undefined || savedToken === undefined ? undefined : { pageId: savedId, token: savedToken };
};
