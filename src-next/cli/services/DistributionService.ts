import type { Client, DistributionsModel, PatchRequest } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';

export type DistributionView = DistributionsModel.Distribution;

interface ReleaseStatus {
  status?: string;
  progress?: number;
}

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

  async startRelease(hash: string): Promise<ReleaseStatus> {
    try {
      const response = await this.client.distributionsApi.createDistributionRelease(this.projectId, hash);

      return response.data as ReleaseStatus;
    } catch (error) {
      throw toCliError(error, `Failed to release distribution ${hash}`);
    }
  }

  async getReleaseStatus(hash: string): Promise<ReleaseStatus> {
    try {
      const response = await this.client.distributionsApi.getDistributionRelease(this.projectId, hash);

      return response.data as ReleaseStatus;
    } catch (error) {
      throw toCliError(error, `Failed to fetch release status for ${hash}`);
    }
  }
}
