import type { Client } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';

export class BranchService {
  constructor(
    private apiClient: Client,
    private projectId: number,
  ) {}

  async getBranch(name?: string) {
    if (!name || name === 'none') {
      return undefined;
    }

    try {
      const branches = await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId, { name, limit: 500 });
      return branches.data.find((branch) => branch.data.name === name)?.data;
    } catch (error) {
      throw toCliError(error, `Failed to find branch ${name}`);
    }
  }

  async getOrCreateBranch(name?: string) {
    if (!name || name === 'none') {
      return undefined;
    }

    try {
      const branches = await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId, { name, limit: 500 });
      const existingBranch = branches.data.find((branch) => branch.data.name === name);

      if (existingBranch !== undefined) {
        return existingBranch.data;
      }

      return (await this.apiClient.sourceFilesApi.createBranch(this.projectId, { name })).data;
    } catch (error) {
      throw toCliError(error, `Failed to resolve branch ${name}`);
    }
  }

  async resolveBranchId(name: string | undefined, createMissing: boolean = false): Promise<number | undefined> {
    const branch = createMissing ? await this.getOrCreateBranch(name) : await this.getBranch(name);

    if (!name || name === 'none') {
      return undefined;
    }

    if (!branch) {
      throw new CliError(`Project doesn't contain the '${name}' branch`);
    }

    return branch.id;
  }

  async listProjectBranches() {
    try {
      return await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId);
    } catch (error) {
      throw toCliError(error, `Failed to fetch branches for project ${this.projectId}`);
    }
  }
}
