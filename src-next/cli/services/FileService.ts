import type { Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';
import { normalizePath } from '../utils/parsing.ts';

export class FileService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async updateProjectFile(
    fileId: number,
    storageId: number,
    localFilePath: string,
    exportPattern?: string,
    attachLabelIds?: number[],
    excludedTargetLanguages?: string[],
  ) {
    try {
      await this.apiClient.sourceFilesApi.updateOrRestoreFile(this.projectId, fileId, {
        storageId,
        exportOptions: { exportPattern },
        attachLabelIds,
      });

      if (excludedTargetLanguages !== undefined) {
        await this.apiClient.sourceFilesApi.editFile(this.projectId, fileId, [
          {
            op: 'replace',
            path: '/excludedTargetLanguages',
            value: excludedTargetLanguages,
          },
        ]);
      }
    } catch (error) {
      throw toCliError(error, `Failed to update ${localFilePath}`);
    }
  }

  async deleteProjectFile(fileId: number, projectFilePath: string) {
    try {
      await this.apiClient.sourceFilesApi.deleteFile(this.projectId, fileId);
    } catch (error) {
      throw toCliError(error, `Failed to delete ${projectFilePath}`);
    }
  }

  async resolveFileIds(rawPaths: string[], branchId?: number): Promise<{ fileIds: number[]; missingPaths: string[] }> {
    const fileIdsByPath = await this.loadFileIdsByPath(branchId);
    const fileIds: number[] = [];
    const missingPaths: string[] = [];

    for (const rawPath of rawPaths) {
      const fileId = fileIdsByPath.get(normalizePath(rawPath));

      if (fileId === undefined) {
        missingPaths.push(rawPath);
        continue;
      }

      fileIds.push(fileId);
    }

    return { fileIds: Array.from(new Set(fileIds)), missingPaths };
  }

  async listProjectFilePaths(branchId?: number): Promise<Map<number, string>> {
    const files = await this.fetchProjectFiles(branchId);
    return new Map(files.map((file) => [file.id, normalizePath(file.path)]));
  }

  async loadProjectFiles(branchId?: number) {
    this.output.spinner('projectFiles', 'start', 'Fetching project files');

    try {
      const projectFiles = await this.apiClient.sourceFilesApi.listProjectFiles(this.projectId, {
        branchId,
        limit: 500,
      });

      this.output.spinner('projectFiles', 'stop', 'Project files fetched');

      return projectFiles;
    } catch (error) {
      const message =
        error instanceof Error ? `Failed to fetch project files. ${error.message}` : 'Failed to fetch project files';
      this.output.spinner('projectFiles', 'error', message);
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  private async fetchProjectFiles(branchId?: number): Promise<Array<{ id: number; path: string }>> {
    try {
      const response = await this.apiClient.sourceFilesApi.listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        limit: 500,
      });

      return response.data.map((entry) => ({ id: entry.data.id, path: entry.data.path }));
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  private async loadFileIdsByPath(branchId?: number): Promise<Map<string, number>> {
    const files = await this.fetchProjectFiles(branchId);
    return new Map(files.map((file) => [normalizePath(file.path), file.id]));
  }
}
