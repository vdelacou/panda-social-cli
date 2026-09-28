import { err, ok } from './result.ts';
import type { Result } from './result.ts';

// A Page id goes into Graph URL paths (the Page, its feed, its photos), so only digits get
// through (rule 12), whether it comes from --page, the environment or the credentials file.
export type FacebookPageId = string & { readonly __brand: 'FacebookPageId' };

export type FacebookPageIdError = { readonly kind: 'invalid-page-id'; readonly message: string };

const DIGITS = /^\d+$/;

// A Graph id, a Page's or a post's own number, is digits only.
export const isGraphNumber = (raw: string): boolean => DIGITS.test(raw);

export const parseFacebookPageId = (raw: string): Result<FacebookPageId, FacebookPageIdError> => {
  if (!isGraphNumber(raw)) return err({ kind: 'invalid-page-id', message: `Not a Facebook Page id: "${raw}".` });
  return ok(raw as FacebookPageId);
};

// Test escape hatch (references/testing.md); the layer zones ban it from production code.
export const facebookPageIdUnsafe = (value: string): FacebookPageId => value as FacebookPageId;

// A Page a user token grants: its own Page token, and the user's tasks on it (null when Meta
// lists none).
export type GrantedPage = {
  readonly id: FacebookPageId;
  readonly name: string;
  readonly token: string;
  readonly tasks: ReadonlyArray<string> | null;
};

export type PageChoiceError = { readonly kind: 'no-pages' | 'choose-page' | 'missing-page-task'; readonly message: string };

const listed = (pages: ReadonlyArray<GrantedPage>): string => pages.map((page) => `${page.id} (${page.name})`).join(', ');

const pick = (pages: ReadonlyArray<GrantedPage>, wanted: FacebookPageId | undefined): Result<GrantedPage, PageChoiceError> => {
  if (pages.length === 0) return err({ kind: 'no-pages', message: 'The token grants no Facebook Page.' });
  if (wanted === undefined) return pages.length === 1 ? ok(pages[0]) : err({ kind: 'choose-page', message: `The token grants several Pages: ${listed(pages)}.` });
  const found = pages.find((page) => page.id === wanted);
  return found ? ok(found) : err({ kind: 'choose-page', message: `The token does not grant the Page ${wanted}. The Pages it grants: ${listed(pages)}.` });
};

// D22: the Page --page names, or the only one granted; posting needs the CREATE_CONTENT task,
// and only a known lack of it is refused.
export const choosePage = (pages: ReadonlyArray<GrantedPage>, wanted: FacebookPageId | undefined): Result<GrantedPage, PageChoiceError> => {
  const chosen = pick(pages, wanted);
  if (!chosen.ok || chosen.value.tasks === null || chosen.value.tasks.includes('CREATE_CONTENT')) return chosen;
  const { id, name } = chosen.value;
  return err({ kind: 'missing-page-task', message: `Your role on ${name} (${id}) lacks the CREATE_CONTENT task, which posting needs.` });
};
