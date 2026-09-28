import { parseImagePath } from '../domain/image-path.ts';
import type { ImagePath } from '../domain/image-path.ts';
import { parseImageUrl } from '../domain/image-url.ts';
import type { ImageUrl } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { FacebookPostContent, InstagramPostContent, Platform, PlatformContent, ThreadsPostContent, XPostContent } from './post-command.ts';
import type { Flags } from './read-flags.ts';

type Values = Flags['values'];

const invalidImage = (message: string): Result<never, Failure> => err({ code: 'invalid-image', message, hint: hintFor('invalid-image') });

const readImageUrl = (value: unknown): Result<ImageUrl | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseImageUrl(typeof value === 'string' ? value : '');
  return parsed.ok ? ok(parsed.value) : invalidImage(parsed.error.message);
};

const readImagePath = (value: unknown): Result<ImagePath | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseImagePath(typeof value === 'string' ? value : '');
  return parsed.ok ? ok(parsed.value) : invalidImage(parsed.error.message);
};

const missingContent = (example: string): Result<never, Failure> =>
  err({ code: 'missing-text', message: 'The post has no text and no image.', hint: `Pass the text with --text, an image with --image, or both. Example: ${example}` });

// What every post carries: its text and --split, each absent when not given.
const textAndSplit = (values: Values): { readonly text?: string; readonly split?: true } => {
  const text = values['text'];
  return { ...(typeof text === 'string' && text !== '' && { text }), ...(values['split'] === true && { split: true }) };
};

// A post needs text, an image, or both; --split only matters for a long text.
export const readThreadsContent = (values: Values, example: string): Result<ThreadsPostContent, Failure> => {
  const image = readImageUrl(values['image']);
  if (!image.ok) return image;
  const content = textAndSplit(values);
  if (content.text === undefined && image.value === undefined) return missingContent(example);
  return ok({ ...content, ...(image.value !== undefined && { imageUrl: image.value }) });
};

export const readXContent = (values: Values, example: string): Result<XPostContent, Failure> => {
  const image = readImagePath(values['image']);
  if (!image.ok) return image;
  const content = textAndSplit(values);
  if (content.text === undefined && image.value === undefined) return missingContent(example);
  return ok({ ...content, ...(image.value !== undefined && { imagePath: image.value }) });
};

// Facebook downloads an https URL itself and takes a local file the CLI uploads (D26): a
// scheme and `://` mark the URL, as they do for the paths X refuses.
const readFacebookImage = (value: unknown): Result<{ readonly imageUrl: ImageUrl } | { readonly imagePath: ImagePath } | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const raw = typeof value === 'string' ? value : '';
  if (raw.includes('://')) {
    const url = parseImageUrl(raw);
    return url.ok ? ok({ imageUrl: url.value }) : invalidImage(url.error.message);
  }
  const path = parseImagePath(raw);
  return path.ok ? ok({ imagePath: path.value }) : invalidImage(path.error.message);
};

// --split is read and left out: Facebook takes a long text whole (D26).
export const readFacebookContent = (values: Values, example: string): Result<FacebookPostContent, Failure> => {
  const image = readFacebookImage(values['image']);
  if (!image.ok) return image;
  const { text } = textAndSplit(values);
  if (image.value === undefined) return text === undefined ? missingContent(example) : ok({ text });
  return ok({ ...(text !== undefined && { text }), ...image.value });
};

// Instagram downloads an https URL itself and has no text-only post (D34); --split is read and
// left out, since the caption goes out whole.
export const readInstagramContent = (values: Values): Result<InstagramPostContent, Failure> => {
  const image = readImageUrl(values['image']);
  if (!image.ok) return image;
  if (image.value === undefined) return err({ code: 'missing-image', message: 'Instagram has no text-only posts, and this one has no image.', hint: hintFor('missing-image') });
  const { text } = textAndSplit(values);
  return ok({ imageUrl: image.value, ...(text !== undefined && { text }) });
};

const CONTENT_READERS: Readonly<Record<Platform, (values: Values, example: string) => Result<PlatformContent, Failure>>> = {
  threads: (values, example) => {
    const content = readThreadsContent(values, example);
    return content.ok ? ok({ platform: 'threads', ...content.value }) : content;
  },
  x: (values, example) => {
    const content = readXContent(values, example);
    return content.ok ? ok({ platform: 'x', ...content.value }) : content;
  },
  facebook: (values, example) => {
    const content = readFacebookContent(values, example);
    return content.ok ? ok({ platform: 'facebook', ...content.value }) : content;
  },
  instagram: (values) => {
    const content = readInstagramContent(values);
    return content.ok ? ok({ platform: 'instagram', ...content.value }) : content;
  },
};

export const readContent = (values: Values, platform: Platform, example: string): Result<PlatformContent, Failure> => CONTENT_READERS[platform](values, example);
