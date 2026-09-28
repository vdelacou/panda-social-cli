import { parseFacebookPostId } from '../domain/facebook-post-id.ts';
import { parseInstagramMediaId } from '../domain/instagram-media-id.ts';
import { parseProfileName } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsPostId } from '../domain/threads-post-id.ts';
import { parseXPostId } from '../domain/x-post-id.ts';
import { PLATFORMS } from './commands/shared-options.ts';
import { didYouMean } from './did-you-mean.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { Platform, PostTarget } from './post-command.ts';
import type { Flags } from './read-flags.ts';

type Values = Flags['values'];

export const isPlatform = (value: unknown): value is Platform => typeof value === 'string' && PLATFORMS.includes(value);

const unknownPlatform = (name: string, example: string): Result<never, Failure> =>
  err({
    code: 'unknown-platform',
    message: `Unknown platform: "${name}".`,
    hint: `${didYouMean(name, PLATFORMS)}Supported platforms: ${PLATFORMS.join(', ')}. Example: ${example}`,
  });

// The --on of update and delete: one platform.
export const readPlatform = (values: Values, example: string): Result<Platform, Failure> => {
  const platform = values['on'];
  return isPlatform(platform) ? ok(platform) : unknownPlatform(String(platform), example);
};

// D38: --to names one platform or several, separated by commas; each is trimmed, and a
// platform named twice is posted to once.
export const readPlatforms = (values: Values, example: string): Result<ReadonlyArray<Platform>, Failure> => {
  const to = values['to'];
  const names = typeof to === 'string' ? to.split(',').map((name) => name.trim()) : [String(to)];
  const unknown = names.find((name) => !isPlatform(name));
  return unknown === undefined ? ok([...new Set(names.filter(isPlatform))]) : unknownPlatform(unknown, example);
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
  instagram: (raw) => {
    const parsed = parseInstagramMediaId(raw);
    return parsed.ok ? ok({ platform: 'instagram', id: parsed.value }) : refusedId(parsed.error.message);
  },
};

// The --id of a post, in the shape its platform gives ids.
export const readPostId = (value: unknown, platform: Platform): Result<PostTarget, Failure> => POST_ID_READERS[platform](typeof value === 'string' ? value : '');
