import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os, { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { DEFAULT_IDENTITY_FILE, getIdentityFilePath, saveCredentials } from '@/lib/identityFiles.ts';

describe('saveCredentials', () => {
  let home: string;
  let homedir: ReturnType<typeof spyOn<typeof os, 'homedir'>>;
  let identityFile: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'crowdin-identity-'));
    homedir = spyOn(os, 'homedir').mockReturnValue(home);
    identityFile = getIdentityFilePath(DEFAULT_IDENTITY_FILE);
  });

  afterEach(async () => {
    // The spy patches the shared module namespace, so leaving it in place breaks every later file.
    homedir.mockRestore();
    await rm(home, { recursive: true, force: true });
  });

  async function readIdentityFile(): Promise<Record<string, unknown>> {
    return loadYaml(await Bun.file(identityFile).text()) as Record<string, unknown>;
  }

  test('writes the token to a fresh identity file', async () => {
    expect(await saveCredentials({ apiToken: 'token' })).toBe(true);
    expect(await readIdentityFile()).toEqual({ api_token: 'token' });
  });

  test('keeps a long token on one line so it survives the YAML round trip', async () => {
    const token = 'a'.repeat(400);

    await saveCredentials({ apiToken: token });

    expect((await readIdentityFile()).api_token).toBe(token);
  });

  test('replaces the token and keeps everything else the file holds', async () => {
    await Bun.write(identityFile, 'api_token: old\nbase_path: /workspace\n');

    await saveCredentials({ apiToken: 'new' });

    expect(await readIdentityFile()).toEqual({ api_token: 'new', base_path: '/workspace' });
  });

  test('stores the base url when one is given and leaves it out otherwise', async () => {
    await saveCredentials({ apiToken: 'token', baseUrl: 'https://acme.api.crowdin.com' });
    expect(await readIdentityFile()).toEqual({ api_token: 'token', base_url: 'https://acme.api.crowdin.com' });

    // A later login without a base url keeps the stored one rather than clearing it.
    await saveCredentials({ apiToken: 'token' });
    expect(await readIdentityFile()).toEqual({ api_token: 'token', base_url: 'https://acme.api.crowdin.com' });
  });

  test('reports failure instead of throwing when the file cannot be written', async () => {
    // A file where the home directory is expected: every write below it fails.
    const blocked = join(home, 'blocked');
    await Bun.write(blocked, '');
    spyOn(os, 'homedir').mockReturnValue(join(blocked, 'home'));

    expect(await saveCredentials({ apiToken: 'token' })).toBe(false);
  });
});
