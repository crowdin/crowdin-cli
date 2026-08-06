import type { Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

export class ProgressService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async loadProjectProgress() {
    return await withSpinner(
      this.output,
      'projectProgress',
      {
        start: 'Fetching project progress',
        stop: 'Project progress fetched',
        fail: 'Failed to fetch project progress',
      },
      () => this.apiClient.translationStatusApi.getProjectProgress(this.projectId),
    );
  }

  async loadBranchProgress(branchId: number) {
    try {
      return await this.apiClient.translationStatusApi.getBranchProgress(this.projectId, branchId);
    } catch (error) {
      throw toCliError(error, `Failed to fetch branch progress for branch ${branchId}`);
    }
  }

  async loadFileProgress(fileId: number) {
    try {
      return await this.apiClient.translationStatusApi.getFileProgress(this.projectId, fileId);
    } catch (error) {
      throw toCliError(error, `Failed to fetch file progress for file ${fileId}`);
    }
  }

  async loadDirectoryProgress(directoryId: number) {
    try {
      return await this.apiClient.translationStatusApi.getDirectoryProgress(this.projectId, directoryId);
    } catch (error) {
      throw toCliError(error, `Failed to fetch directory progress for directory ${directoryId}`);
    }
  }
}
