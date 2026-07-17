import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client, CrowdinError } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { BundleService } from '@/cli/services/BundleService.ts';

const PROJECT_ID = 123;

describe('BundleService', () => {
  let apiClient: Client;
  let bundleService: BundleService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    bundleService = new BundleService(apiClient, PROJECT_ID);
    spyOn(Bun, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('exportBundle', () => {
    test('starts, polls until finished, then returns the export identifier', async () => {
      const start = spyOn(apiClient.bundlesApi, 'exportBundle').mockResolvedValue({
        data: { identifier: 'export-1', status: 'created', progress: 0 },
      } as never);
      const statuses = [
        { data: { identifier: 'export-1', status: 'inProgress', progress: 50 } },
        { data: { identifier: 'export-1', status: 'finished', progress: 100 } },
      ];
      const statusSpy = spyOn(apiClient.bundlesApi, 'checkBundleExportStatus').mockImplementation(
        async () => statuses.shift() as never,
      );
      const progress: number[] = [];

      const result = await bundleService.exportBundle(5, (p) => progress.push(p));

      expect(start).toHaveBeenCalledWith(PROJECT_ID, 5);
      expect(statusSpy).toHaveBeenCalledWith(PROJECT_ID, 5, 'export-1');
      expect(statusSpy).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([50, 100]);
      expect(result).toBe('export-1');
    });

    test('throws when the export status reports failure', async () => {
      spyOn(apiClient.bundlesApi, 'exportBundle').mockResolvedValue({
        data: { identifier: 'export-1', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.bundlesApi, 'checkBundleExportStatus').mockResolvedValue({
        data: { identifier: 'export-1', status: 'failed', progress: 0 },
      } as never);

      expect(bundleService.exportBundle(5)).rejects.toThrow(new CliError('Failed to build the bundle'));
    });

    // Java retries the export start on a transient "another export in progress" error.
    test('retries the start on a transient in-progress error', async () => {
      const start = spyOn(apiClient.bundlesApi, 'exportBundle')
        .mockRejectedValueOnce(
          new CrowdinError("Another export is currently in progress. Please wait until it's finished.", 400, {}),
        )
        .mockResolvedValueOnce({ data: { identifier: 'export-1', status: 'finished', progress: 100 } } as never);

      const result = await bundleService.exportBundle(5);

      expect(start).toHaveBeenCalledTimes(2);
      expect(result).toBe('export-1');
    });
  });
});
