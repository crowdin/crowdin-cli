import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { DistributionService } from '@/cli/services/DistributionService.ts';

const PROJECT_ID = 123;

describe('DistributionService', () => {
  let apiClient: Client;
  let distributionService: DistributionService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    distributionService = new DistributionService(apiClient, PROJECT_ID);
    spyOn(Bun, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('releaseDistribution', () => {
    // Release is async server-side; releaseDistribution waits until the status leaves the pending
    // state, reporting each poll's progress along the way. "success" is a terminal, not an error.
    test('starts, polls until the status is no longer pending, reporting each poll', async () => {
      const start = spyOn(apiClient.distributionsApi, 'createDistributionRelease').mockResolvedValue({
        data: { status: 'inProgress', progress: 20 },
      } as never);
      const statuses = [
        { data: { status: 'inProgress', progress: 60 } },
        { data: { status: 'success', progress: 100 } },
      ];
      const statusSpy = spyOn(apiClient.distributionsApi, 'getDistributionRelease').mockImplementation(
        async () => statuses.shift() as never,
      );
      const progress: number[] = [];

      await distributionService.releaseDistribution('hash-1', (p) => progress.push(p));

      expect(start).toHaveBeenCalledWith(PROJECT_ID, 'hash-1');
      expect(statusSpy).toHaveBeenCalledWith(PROJECT_ID, 'hash-1');
      expect(statusSpy).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([20, 60]);
    });

    test('throws when the release status reports failure', async () => {
      spyOn(apiClient.distributionsApi, 'createDistributionRelease').mockResolvedValue({
        data: { status: 'inProgress', progress: 0 },
      } as never);
      spyOn(apiClient.distributionsApi, 'getDistributionRelease').mockResolvedValue({
        data: { status: 'failed', progress: 0 },
      } as never);

      expect(distributionService.releaseDistribution('hash-1')).rejects.toThrow(
        new CliError('Distribution release failed'),
      );
    });

    test('wraps a start error as CliError', async () => {
      spyOn(apiClient.distributionsApi, 'createDistributionRelease').mockRejectedValue(new Error('boom'));

      expect(distributionService.releaseDistribution('hash-1')).rejects.toThrow(CliError);
    });
  });
});
