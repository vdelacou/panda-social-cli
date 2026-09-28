import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { CredentialsFile } from '../domain/credentials.ts';
import { err, ok } from '../domain/result.ts';
import type { Result } from '../domain/result.ts';
import { formatError } from '../domain/utilities/format-error.ts';
import type { CredentialStore, CredentialStoreError } from '../use-cases/ports/credential-store.ts';

// Rule 20's commented exception: this file holds tokens, so it must be born 0600 in a
// 0700 folder. Bun.write ignores `mode` for string content (checked on Bun 1.3.11), and
// the published CLI also runs on Node; node:fs/promises does both, on both runtimes.

const isMissing = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null && !Array.isArray(value);

// The file is read back from disk, where a hand edit can leave anything: only a
// version-1 document with a profiles object is trusted as credentials.
const asCredentials = (value: unknown): CredentialsFile | undefined => {
  if (!isRecord(value) || value['version'] !== 1 || !isRecord(value['profiles'])) return undefined;
  return value as CredentialsFile;
};

const parse = (file: string, text: string): Result<CredentialsFile, CredentialStoreError> => {
  try {
    const credentials = asCredentials(JSON.parse(text));
    if (credentials) return ok(credentials);
    return err({ kind: 'corrupt', message: `${file} is not a panda-social credentials file` });
  } catch (error) {
    return err({ kind: 'corrupt', message: `${file}: ${formatError(error)}` });
  }
};

const load = async (file: string): Promise<Result<CredentialsFile, CredentialStoreError>> => {
  try {
    return parse(file, await readFile(file, 'utf8'));
  } catch (error) {
    if (isMissing(error)) return ok(EMPTY_CREDENTIALS);
    return err({ kind: 'unreadable', message: `${file}: ${formatError(error)}` });
  }
};

// Written to a temporary file then renamed, so a crash mid-write never leaves half a file.
const save = async (file: string, credentials: CredentialsFile): Promise<Result<void, CredentialStoreError>> => {
  try {
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(credentials, undefined, 2)}\n`, { mode: 0o600 });
    await rename(temporary, file);
    return ok(undefined);
  } catch (error) {
    return err({ kind: 'write-failed', message: `${file}: ${formatError(error)}` });
  }
};

export const createCredentialStoreFile = (file: string): CredentialStore => ({
  load: async () => load(file),
  update: async (change) => {
    const current = await load(file);
    if (!current.ok) return current;
    return save(file, change(current.value));
  },
});
