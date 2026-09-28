import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EMPTY_CREDENTIALS } from '../domain/credentials.ts';
import type { CredentialsFile } from '../domain/credentials.ts';
import { createCredentialStoreFile } from './credential-store-file.ts';

const SAVED: CredentialsFile = {
  version: 1,
  profiles: { default: { threads: { token: 'stored-token', userId: '26000000000000001', username: 'panda', savedAt: '2026-09-28T09:30:00.000Z' } } },
};

describe('the credentials file', () => {
  let home = '';
  let file = '';
  beforeEach(() => {
    home = mkdtempSync(path.join(tmpdir(), 'panda-social-'));
    file = path.join(home, '.panda-social', 'credentials.json');
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it('a missing credentials file loads as an empty store', async () => {
    expect(await createCredentialStoreFile(file).load()).toEqual({ ok: true, value: EMPTY_CREDENTIALS });
  });

  it('saved credentials are written with owner-only permissions (0600) in a 0700 folder and load back unchanged', async () => {
    const store = createCredentialStoreFile(file);

    const saved = await store.update(() => SAVED);

    expect(saved).toEqual({ ok: true, value: undefined });
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(path.dirname(file)).mode & 0o777).toBe(0o700);
    expect(await store.load()).toEqual({ ok: true, value: SAVED });
  });

  it('a credentials file that is not valid JSON loads as corrupt, with the file path in the message', async () => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '{ not json');

    const result = await createCredentialStoreFile(file).load();

    expect(!result.ok && result.error.kind).toBe('corrupt');
    expect(!result.ok && result.error.message).toContain(file);
  });
});
