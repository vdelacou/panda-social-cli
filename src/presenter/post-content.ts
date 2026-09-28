import { parseImageUrl } from '../domain/image-url.ts';
import type { ImageUrl } from '../domain/image-url.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import type { Failure } from './failure.ts';
import { hintFor } from './hints.ts';
import type { PostContent } from './post-command.ts';
import type { Flags } from './read-flags.ts';

type Values = Flags['values'];

const invalidImage = (message: string): Result<never, Failure> => err({ code: 'invalid-image', message, hint: hintFor('invalid-image') });

const readImageUrl = (value: unknown): Result<ImageUrl | undefined, Failure> => {
  if (value === undefined) return ok(undefined);
  const parsed = parseImageUrl(typeof value === 'string' ? value : '');
  return parsed.ok ? ok(parsed.value) : invalidImage(parsed.error.message);
};

const missingContent = (example: string): Result<never, Failure> =>
  err({ code: 'missing-text', message: 'The post has no text and no image.', hint: `Pass the text with --text, an image URL with --image, or both. Example: ${example}` });

// What every post carries: its text and --split, each absent when not given.
const textAndSplit = (values: Values): { readonly text?: string; readonly split?: true } => {
  const text = values['text'];
  return { ...(typeof text === 'string' && text !== '' && { text }), ...(values['split'] === true && { split: true }) };
};

// A post needs text, an image, or both; --split only matters for a long text.
export const readContent = (values: Values, example: string): Result<PostContent, Failure> => {
  const image = readImageUrl(values['image']);
  if (!image.ok) return image;
  const content = textAndSplit(values);
  if (content.text === undefined && image.value === undefined) return missingContent(example);
  return ok({ ...content, ...(image.value !== undefined && { imageUrl: image.value }) });
};
