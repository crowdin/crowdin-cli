import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFromFile } from '@/lib/identity/yamlLoader.ts';

const TOKEN = 'a'.repeat(80);

describe('identity loadFromFile', () => {
  let tempDir: string;
  let identityPath: string;

  const write = (yaml: string) => Bun.write(identityPath, yaml);

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-identity-'));
    identityPath = join(tempDir, 'identity.yml');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('maps snake_case yaml keys to the camelCase identity', async () => {
    await write(
      ['project_id: 42', `api_token: "${TOKEN}"`, 'base_path: /repo', 'base_url: https://acme.crowdin.com', ''].join(
        '\n',
      ),
    );

    const identity = await loadFromFile(identityPath);

    expect(identity).toEqual({
      projectId: 42,
      apiToken: TOKEN,
      basePath: '/repo',
      baseUrl: 'https://acme.crowdin.com',
    });
  });

  test('coerces a string project_id to a number', async () => {
    await write(`project_id: "7"\napi_token: "${TOKEN}"\n`);

    const identity = await loadFromFile(identityPath);

    expect(identity.projectId).toBe(7);
  });

  test('leaves omitted fields undefined', async () => {
    await write(`api_token: "${TOKEN}"\n`);

    const identity = await loadFromFile(identityPath);

    expect(identity.apiToken).toBe(TOKEN);
    expect(identity.projectId).toBeUndefined();
    expect(identity.basePath).toBeUndefined();
    expect(identity.baseUrl).toBeUndefined();
  });

  test('rejects an api token shorter than 80 chars', async () => {
    await write('api_token: "tooshort"\n');

    await expect(loadFromFile(identityPath)).rejects.toThrow();
  });

  test('rejects a non-positive project_id', async () => {
    await write('project_id: 0\n');

    await expect(loadFromFile(identityPath)).rejects.toThrow();
  });
});
