import path from 'node:path';
import { formatError } from '../../src/domain/utilities/format-error.ts';
import type { Runner } from './answer.ts';

export type Session = {
  readonly run: Runner;
  // The run's time, in every text it posts, so no two runs post the same words.
  readonly stamp: string;
  // The profile named with --profile, or the CLI's own default.
  readonly profile: string;
  // A public https URL to a JPEG (--image), and the same image downloaded into `work`.
  readonly image?: string;
  readonly imageFile?: string;
  // A throwaway folder for this run: the downloaded image and the renewal's HOME.
  readonly work: string;
  readonly publish: boolean;
  readonly renewal: boolean;
  // Standard input is a terminal, so the run can pause before it deletes.
  readonly interactive: boolean;
};

export const textOf = (session: Session, what: string): string => `panda-social live QA ${session.stamp}: ${what}`;

// The --image downloaded once, for the commands and the probe that take a local file: the file,
// or why it did not download.
export const downloadImage = async (url: string, work: string): Promise<{ readonly file: string } | { readonly problem: string }> => {
  try {
    const answer = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!answer.ok) return { problem: `HTTP ${answer.status}` };
    const file = path.join(work, `qa-image${path.extname(new URL(url).pathname) || '.jpg'}`);
    await Bun.write(file, await answer.arrayBuffer());
    return { file };
  } catch (error) {
    return { problem: formatError(error) };
  }
};
