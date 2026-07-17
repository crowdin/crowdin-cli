import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { StringService } from '@/cli/services/StringService.ts';

const PROJECT_ID = 123;

describe('StringService', () => {
  let apiClient: Client;
  let stringService: StringService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    stringService = new StringService(apiClient, PROJECT_ID);

    mock.module('bun', () => ({ sleep: mock(async () => {}) }));
  });

  afterEach(() => {
    mock.restore();
  });

  describe('uploadStrings', () => {
    const request = { branchId: 5, storageId: 10 };

    // The upload is queued server-side; the service must wait for the status to finish before
    // returning, so a caller cannot mistake "queued" for "done".
    test('polls the upload status until it finishes, reporting each poll', async () => {
      spyOn(apiClient.sourceStringsApi, 'uploadStrings').mockResolvedValue({
        data: { identifier: 'upload-1', status: 'created', progress: 0 },
      } as never);

      const statuses = [
        { data: { identifier: 'upload-1', status: 'in_progress', progress: 50 } },
        { data: { identifier: 'upload-1', status: 'finished', progress: 100 } },
      ];
      const statusSpy = spyOn(apiClient.sourceStringsApi, 'uploadStringsStatus').mockImplementation(
        async () => statuses.shift() as never,
      );
      const progress: number[] = [];

      await stringService.uploadStrings(request, 'src/app.json', (status) => progress.push(status.progress));

      expect(statusSpy).toHaveBeenCalledWith(PROJECT_ID, 'upload-1');
      expect(statusSpy).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([50, 100]);
    });

    test('throws when the upload status reports failure', async () => {
      spyOn(apiClient.sourceStringsApi, 'uploadStrings').mockResolvedValue({
        data: { identifier: 'upload-1', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.sourceStringsApi, 'uploadStringsStatus').mockResolvedValue({
        data: { identifier: 'upload-1', status: 'failed', progress: 0 },
      } as never);

      expect(stringService.uploadStrings(request, 'src/app.json')).rejects.toThrow(
        'Failed to upload strings for file src/app.json',
      );
    });

    test('wraps an upload request error as CliError', async () => {
      spyOn(apiClient.sourceStringsApi, 'uploadStrings').mockRejectedValue(new Error('boom'));

      expect(stringService.uploadStrings(request, 'src/app.json')).rejects.toThrow(CliError);
    });
  });
});
