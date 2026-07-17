import type { Client, PatchRequest, SourceFilesModel } from '@crowdin/crowdin-api-client';
import { CrowdinValidationError } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import CliError from '../errors/CliError.ts';
import { toCliError } from '../errors/toCliError.ts';

// Reports each poll's percentage so the command can render its own progress (Java updates a spinner).
export type ProgressCallback = (progress: number) => void;

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
      const branches = await this.apiClient.sourceFilesApi.withFetchAll().listProjectBranches(this.projectId, { name });
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
      const branches = await this.apiClient.sourceFilesApi.withFetchAll().listProjectBranches(this.projectId, { name });
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

  async list(): Promise<SourceFilesModel.Branch[]> {
    try {
      const response = await this.apiClient.sourceFilesApi.withFetchAll().listProjectBranches(this.projectId);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list branches');
    }
  }

  async add(request: SourceFilesModel.CreateBranchRequest): Promise<SourceFilesModel.Branch> {
    try {
      return (await this.apiClient.sourceFilesApi.createBranch(this.projectId, request)).data;
    } catch (error) {
      throw toCliError(error, `Failed to add branch '${request.name}'`);
    }
  }

  async delete(branchId: number): Promise<void> {
    try {
      await this.apiClient.sourceFilesApi.deleteBranch(this.projectId, branchId);
    } catch (error) {
      throw toCliError(error, 'Failed to delete branch');
    }
  }

  async edit(branchId: number, request: PatchRequest[]): Promise<SourceFilesModel.Branch> {
    try {
      return (await this.apiClient.sourceFilesApi.editBranch(this.projectId, branchId, request)).data;
    } catch (error) {
      throw toCliError(error, 'Failed to edit branch');
    }
  }

  // Clone is async server-side: start it, wait for the status to finish, then return the new branch.
  // Keeping the wait here means a caller can't act on a half-cloned branch. onProgress reports each
  // poll's percentage so the command can update its spinner.
  async cloneBranch(
    branchId: number,
    request: SourceFilesModel.CloneBranchRequest,
    onProgress?: ProgressCallback,
  ): Promise<SourceFilesModel.Branch> {
    let started: Awaited<ReturnType<Client['sourceFilesApi']['clonedBranch']>>;

    try {
      started = await this.apiClient.sourceFilesApi.clonedBranch(this.projectId, branchId, request);
    } catch (error) {
      if (error instanceof CrowdinValidationError && error.message.includes('Name must be unique')) {
        throw new CliError(`Branch '${request.title ?? request.name}' already exists in the project`);
      }

      throw toCliError(error, 'Failed to clone the branch');
    }

    const cloneId = started.data.identifier;

    await pollUntilFinished(
      started,
      (id) => this.apiClient.sourceFilesApi.checkBranchClonedStatus(this.projectId, branchId, id),
      'Failed to clone the branch',
      (status) => onProgress?.(status.progress),
    );

    try {
      return (await this.apiClient.sourceFilesApi.getClonedBranch(this.projectId, branchId, cloneId)).data;
    } catch (error) {
      throw toCliError(error, 'Failed to clone the branch');
    }
  }

  // Same shape as cloneBranch: start, wait, then return the merge summary.
  async mergeBranch(
    branchId: number,
    request: SourceFilesModel.MergeBranchRequest,
    onProgress?: ProgressCallback,
  ): Promise<SourceFilesModel.MergeBranchSummary> {
    let started: Awaited<ReturnType<Client['sourceFilesApi']['mergeBranch']>>;

    try {
      started = await this.apiClient.sourceFilesApi.mergeBranch(this.projectId, branchId, request);
    } catch (error) {
      throw toCliError(error, 'Failed to merge the branch');
    }

    const mergeId = started.data.identifier;

    await pollUntilFinished(
      started,
      (id) => this.apiClient.sourceFilesApi.checkBranchMergeStatus(this.projectId, branchId, id),
      'Failed to merge the branch',
      (status) => onProgress?.(status.progress),
    );

    try {
      return (await this.apiClient.sourceFilesApi.getBranchMergeSummary(this.projectId, branchId, mergeId)).data;
    } catch (error) {
      throw toCliError(error, 'Failed to merge the branch');
    }
  }
}
