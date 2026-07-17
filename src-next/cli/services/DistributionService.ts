import type { Client, DistributionsModel, PatchRequest } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';

export type DistributionView = DistributionsModel.Distribution;

interface ReleaseStatus {
  status?: string;
  progress?: number;
}

// The release poll stops on any of these; only "failed" is an error (Java treats success/finished alike).
const RELEASE_TERMINAL_STATUSES = new Set(['success', 'finished', 'failed']);

export class DistributionService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(): Promise<DistributionView[]> {
    try {
      const response = await this.client.distributionsApi.listDistributions(this.projectId);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list distributions');
    }
  }

  async add(name: string, bundleIds: number[]): Promise<DistributionView> {
    try {
      const response = await this.client.distributionsApi.createDistribution(this.projectId, { name, bundleIds });

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Failed to add distribution');
    }
  }

  async edit(hash: string, patch: PatchRequest[]): Promise<DistributionView> {
    try {
      const response = await this.client.distributionsApi.editDistribution(this.projectId, hash, patch);

      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to edit distribution ${hash}`);
    }
  }

  async getByHash(hash: string): Promise<DistributionView> {
    const distributions = await this.list();
    const distribution = distributions.find((entry) => entry.hash === hash);

    if (!distribution) {
      throw new CliError("Couldn't find distribution with the specified hash");
    }

    return distribution;
  }

  // Release is async server-side: start it, then poll until the status leaves the pending state.
  // This state machine differs from the finished/failed one pollUntilFinished handles — the status
  // is optional and a terminal "success" is distinct from "finished" — so the loop lives here.
  // onProgress reports each poll's percentage so the command can update its spinner.
  async releaseDistribution(hash: string, onProgress?: (progress: number) => void): Promise<void> {
    let release: ReleaseStatus;

    try {
      release = (await this.client.distributionsApi.createDistributionRelease(this.projectId, hash))
        .data as ReleaseStatus;
    } catch (error) {
      throw toCliError(error, `Failed to release distribution ${hash}`);
    }

    while (!RELEASE_TERMINAL_STATUSES.has(release.status?.toLowerCase() ?? '')) {
      if (release.progress !== undefined) {
        onProgress?.(release.progress);
      }

      await Bun.sleep(1000);

      try {
        release = (await this.client.distributionsApi.getDistributionRelease(this.projectId, hash))
          .data as ReleaseStatus;
      } catch (error) {
        throw toCliError(error, `Failed to fetch release status for ${hash}`);
      }
    }

    if (release.status?.toLowerCase() === 'failed') {
      throw new CliError('Distribution release failed');
    }
  }
}
