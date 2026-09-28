import { parseImageUrl } from '../domain/image-url.ts';
import type { ImageUrl } from '../domain/image-url.ts';
import { parseProfileName } from '../domain/profile-name.ts';
import type { ProfileName } from '../domain/profile-name.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { parseThreadsPostId } from '../domain/threads-post-id.ts';
import type { ThreadsPostId } from '../domain/threads-post-id.ts';
import type { PostContent } from './cli-command.ts';
import { THREADS_ONLY } from './commands/shared-options.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { Flags } from './read-flags.ts';

type Values = Flags['values'];

export const readPlatform = (values: Values, flag: 'to' | 'on', example: string): Result<'threads', Failure> => {
  const platform = values[flag];
  if (platform === 'threads') return ok(platform);
  return err({ code: 'unknown-platform', message: `Unknown platform: ${String(platform)}.`, hint: `Supported platforms: ${THREADS_ONLY.join(', ')}. Example: ${example}` });
};

export const readProfile = (value: unknown): Result<ProfileName | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseProfileName(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({ code: 'invalid-profile', message: parsed.error.message, hint: hintFor('invalid-profile') });
};

export const readPostId = (value: unknown): Result<ThreadsPostId, Failure> => {
  const parsed = parseThreadsPostId(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({ code: 'invalid-post-id', message: parsed.error.message, hint: hintFor('invalid-post-id') });
};

const readImage = (value: unknown): Result<ImageUrl | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseImageUrl(typeof value === 'string' ? value : '');
  if (parsed.ok) return ok(parsed.value);
  return err({ code: 'invalid-image', message: parsed.error.message, hint: hintFor('invalid-image') });
};

const textOf = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? value : undefined);

// A post needs text, an image, or both; --split only matters for a long text.
export const readContent = (values: Values, example: string): Result<PostContent, Failure> => {
  const text = textOf(values['text']);
  const image = readImage(values['image']);
  if (!image.ok) return image;
  if (text === undefined && image.value === undefined) {
    return err({ code: 'missing-text', message: 'The post has no text and no image.', hint: `Pass the text with --text, an image URL with --image, or both. Example: ${example}` });
  }
  return ok({ ...(text !== undefined && { text }), ...(image.value !== undefined && { imageUrl: image.value }), ...(values['split'] === true && { split: true }) });
};
