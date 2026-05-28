import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@crowdin/crowdin-api-client';
import { StorageService } from '@/cli/services/StorageService.ts';

describe('StorageService', () => {
  let tempDir: string;
  let apiClient: Client;
  let storageService: StorageService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'crowdin-storage-service-'));
    apiClient = new Client({ token: 'a'.repeat(80) });
    storageService = new StorageService(apiClient);
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  test('addStorage uploads binary payload for image files', async () => {
    const localFilePath = join(tempDir, 'test-screenshot.png');
    await Bun.write(localFilePath, Bun.file('testing/test-screenshot.png'));

    const addStorageSpy = spyOn(apiClient.uploadStorageApi, 'addStorage').mockResolvedValue({
      data: { id: 44, fileName: 'test-screenshot.png' },
    } as never);

    await storageService.addStorage(Bun.file(localFilePath));

    const uploadedBody = addStorageSpy.mock.calls[0]?.[1];

    expect(addStorageSpy).toHaveBeenCalledWith('test-screenshot.png', expect.any(Uint8Array), 'image/png');
    expect(typeof uploadedBody).not.toBe('string');
  });
});
