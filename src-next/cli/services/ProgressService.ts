import type { Client, TranslationStatusModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

export class ProgressService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async loadProjectProgress(): Promise<TranslationStatusModel.LanguageProgress[]> {
    const response = await withSpinner(
      this.output,
      'projectProgress',
      {
        start: 'Fetching project progress',
        stop: 'Project progress fetched',
        fail: 'Failed to fetch project progress',
      },
      () => this.apiClient.translationStatusApi.withFetchAll().getProjectProgress(this.projectId),
    );

    return response.data.map((entry) => entry.data);
  }

  async loadBranchProgress(branchId: number): Promise<TranslationStatusModel.LanguageProgress[]> {
    try {
      const response = await this.apiClient.translationStatusApi
        .withFetchAll()
        .getBranchProgress(this.projectId, branchId);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, `Failed to fetch branch progress for branch ${branchId}`);
    }
  }

  async loadFileProgress(fileId: number): Promise<TranslationStatusModel.LanguageProgress[]> {
    try {
      const response = await this.apiClient.translationStatusApi.withFetchAll().getFileProgress(this.projectId, fileId);
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, `Failed to fetch file progress for file ${fileId}`);
    }
  }

  async loadDirectoryProgress(directoryId: number): Promise<TranslationStatusModel.LanguageProgress[]> {
    try {
      const response = await this.apiClient.translationStatusApi
        .withFetchAll()
        .getDirectoryProgress(this.projectId, directoryId);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, `Failed to fetch directory progress for directory ${directoryId}`);
    }
  }
}
