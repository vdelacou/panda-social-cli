import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseJson, pick } from './answer.ts';
import { savedCredentials } from './credentials.ts';
import { check, said } from './report.ts';
import type { Check } from './report.ts';
import type { Session } from './session.ts';

const ENVIRONMENT_TOKEN = { threads: 'PANDA_SOCIAL_THREADS_TOKEN', instagram: 'PANDA_SOCIAL_INSTAGRAM_TOKEN' } as const;

const DAY_MS = 86_400_000;

const NAME = 'renew the token';

// D44: a throwaway HOME holding only this token, saved 31 days ago as far as the CLI can tell.
const backdatedHome = async (session: Session, platform: string, saved: Readonly<Record<string, unknown>>): Promise<string> => {
  const home = path.join(session.work, `renewal-${platform}`);
  await mkdir(path.join(home, '.panda-social'), { recursive: true, mode: 0o700 });
  const backdated = { ...saved, savedAt: new Date(Date.now() - 31 * DAY_MS).toISOString() };
  const file = { version: 1, profiles: { [session.profile]: { [platform]: backdated } } };
  await writeFile(path.join(home, '.panda-social', 'credentials.json'), JSON.stringify(file), { mode: 0o600 });
  return home;
};

const tokenIn = async (home: string, profile: string, platform: string): Promise<unknown> => {
  const file = await Bun.file(path.join(home, '.panda-social', 'credentials.json')).text();
  return pick(parseJson(file), 'profiles', profile, platform, 'token');
};

// The last line the CLI wrote to stderr: its warning when Meta refused the renewal.
const lastLine = (stderr: string): string => stderr.trim().split('\n').at(-1) ?? 'no warning';

export const renewalChecks = async (session: Session, platform: 'threads' | 'instagram'): Promise<ReadonlyArray<Check>> => {
  const variable = ENVIRONMENT_TOKEN[platform];
  // Empty counts as unset, as the CLI reads it.
  if ((process.env[variable] ?? '').trim() !== '') return [check(NAME, 'note', `skipped: ${variable} is set, and the CLI never renews a token from the environment`)];
  const saved = await savedCredentials(session.profile, platform);
  if (saved === undefined) return [check(NAME, 'fail', `no saved ${platform} token in profile ${session.profile}: run setup first`)];
  const home = await backdatedHome(session, platform, saved);
  const status = session.run(['status', platform], { home, without: [variable] });
  if (!status.ok) return [check(NAME, 'fail', said(status))];
  if (pick(status.data, 'token', 'refreshed') !== true) return [check(NAME, 'fail', `not renewed: ${lastLine(status.stderr)}`)];
  const renewed = await tokenIn(home, session.profile, platform);
  if (typeof renewed !== 'string' || renewed === saved['token']) return [check(NAME, 'fail', `renewed but not saved: ${lastLine(status.stderr)}`)];
  const saving = session.run(['setup', platform, '--token-stdin'], { stdin: renewed });
  return [
    check(NAME, 'pass', `renewed, expires ${String(pick(status.data, 'token', 'expiresAt'))}`),
    check('save the renewed token through setup', saving.ok ? 'pass' : 'fail', said(saving)),
  ];
};
