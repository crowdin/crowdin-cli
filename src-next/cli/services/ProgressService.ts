import type { Client } from '@crowdin/crowdin-api-client';
import CliError from '../errors/CliError.ts';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';

export class ProgressService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async loadProjectProgress() {
    this.output.spinner('projectProgress', 'start', 'Fetching project progress');

    try {
      const projectProgress = await this.apiClient.translationStatusApi.getProjectProgress(this.projectId);

      this.output.spinner('projectProgress', 'stop', 'Project progress fetched');

      return projectProgress;
    } catch (error) {
      const message =
        error instanceof Error
          ? `Failed to fetch project progress. ${error.message}`
          : 'Failed to fetch project progress';
      this.output.spinner('projectProgress', 'error', message);
      throw new CliError(message, 1, true);
    }
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
