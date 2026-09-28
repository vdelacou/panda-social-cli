import { parseFacebookPostId } from '../domain/facebook-post-id.ts';
import { parseProfileName } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsPostId } from '../domain/threads-post-id.ts';
import { parseXPostId } from '../domain/x-post-id.ts';
import { PLATFORMS } from './commands/shared-options.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { Platform, PostTarget } from './post-command.ts';
import type { Flags } from './read-flags.ts';

type Values = Flags['values'];

export const isPlatform = (value: unknown): value is Platform => typeof value === 'string' && PLATFORMS.includes(value);

export const readPlatform = (values: Values, flag: 'to' | 'on', example: string): Result<Platform, Failure> => {
  const platform = values[flag];
  if (isPlatform(platform)) return ok(platform);
  return err({ code: 'unknown-platform', message: `Unknown platform: ${String(platform)}.`, hint: `Supported platforms: ${PLATFORMS.join(', ')}. Example: ${example}` });
};

export const readProfile = (value: unknown): Result<ProfileName | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseProfileName(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({ code: 'invalid-profile', message: parsed.error.message, hint: hintFor('invalid-profile') });
};

const refusedId = (message: string): Result<never, Failure> => err({ code: 'invalid-post-id', message, hint: hintFor('invalid-post-id') });

// Each platform's post id, checked before it can reach a URL path.
const POST_ID_READERS: Readonly<Record<Platform, (raw: string) => Result<PostTarget, Failure>>> = {
  threads: (raw) => {
    const parsed = parseThreadsPostId(raw);
    return parsed.ok ? ok({ platform: 'threads', id: parsed.value }) : refusedId(parsed.error.message);
  },
  x: (raw) => {
    const parsed = parseXPostId(raw);
    return parsed.ok ? ok({ platform: 'x', id: parsed.value }) : refusedId(parsed.error.message);
  },
  facebook: (raw) => {
    const parsed = parseFacebookPostId(raw);
    return parsed.ok ? ok({ platform: 'facebook', id: parsed.value }) : refusedId(parsed.error.message);
  },
};

// The --id of a post, in the shape its platform gives ids.
export const readPostId = (value: unknown, platform: Platform): Result<PostTarget, Failure> => POST_ID_READERS[platform](typeof value === 'string' ? value : '');
