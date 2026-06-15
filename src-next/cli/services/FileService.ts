import { type Client, CrowdinError, type SourceFilesModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';
import { normalizePath } from '../utils/parsing.ts';

// The API answers with 409 Conflict while a previous upload of the same file is still processing.
export class FileInUpdateError extends Error {
  constructor() {
    super('File is currently being updated');
    this.name = 'FileInUpdateError';
  }
}

// The API rejects a new file whose name collides with an existing project file ("Name must be unique").
export class FileExistsError extends Error {
  constructor() {
    super('Project already contains the file');
    this.name = 'FileExistsError';
  }
}

function isFileInUpdateError(error: unknown): boolean {
  return error instanceof CrowdinError && error.code === 409;
}

function isFileExistsError(error: unknown): boolean {
  if (!(error instanceof CrowdinError)) {
    return false;
  }

  return `${error.message} ${JSON.stringify(error.apiError ?? '')}`.includes('Name must be unique');
}

export class FileService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async createProjectFile(data: SourceFilesModel.CreateFileRequest) {
    try {
      return await this.apiClient.sourceFilesApi.createFile(this.projectId, data);
    } catch (error) {
      if (isFileExistsError(error)) {
        throw new FileExistsError();
      }

      throw toCliError(error, `Failed to create file ${data.name}`);
    }
  }

  async updateProjectFile(
    fileId: number,
    storageId: number,
    localFilePath: string,
    exportOptions?: SourceFilesModel.ExportOptions,
    importOptions?: SourceFilesModel.ImportOptions,
    updateOption?: SourceFilesModel.UpdateOption,
    attachLabelIds?: number[],
    excludedTargetLanguages?: string[],
  ) {
    try {
      await this.apiClient.sourceFilesApi.updateOrRestoreFile(this.projectId, fileId, {
        storageId,
        exportOptions,
        importOptions,
        updateOption,
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
      if (isFileInUpdateError(error)) {
        throw new FileInUpdateError();
      }

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

  async loadProjectFiles(branchId?: number) {
    this.output.spinner('projectFiles', 'start', 'Fetching project files');

    try {
      const projectFiles = await this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(this.projectId, {
        branchId,
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

  async listProjectFilePaths(branchId?: number): Promise<Map<number, string>> {
    const files = await this.fetchProjectFiles(branchId);
    return new Map(files.map((file) => [file.id, normalizePath(file.path)]));
  }

  private async fetchProjectFiles(branchId?: number): Promise<Array<{ id: number; path: string }>> {
    try {
      const response = await this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
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

  async getSourceFileDownloadUrl(fileId: number): Promise<string> {
    try {
      const response = await this.apiClient.sourceFilesApi.downloadFile(this.projectId, fileId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, `Failed to get download URL for file ${fileId}`);
    }
  }

  async buildReviewedSources(branchId?: number) {
    this.output.spinner('reviewedBuild', 'start', 'Building reviewed sources...');

    try {
      const build = await this.apiClient.sourceFilesApi.buildReviewedSourceFiles(this.projectId, { branchId });

      while (true) {
        const status = await this.apiClient.sourceFilesApi.checkReviewedSourceFilesBuildStatus(
          this.projectId,
          build.data.id,
        );

        if (status.data.status === 'finished') {
          break;
        }

        if (status.data.status === 'failed') {
          throw new CliError('Reviewed sources build failed');
        }

        await Bun.sleep(2000);
      }

      this.output.spinner('reviewedBuild', 'stop', 'Reviewed sources built');

      return build;
    } catch (error) {
      this.output.spinner('reviewedBuild', 'error', 'Reviewed sources build failed');
      throw toCliError(error, 'Failed to build reviewed sources');
    }
  }

  async getReviewedSourcesDownloadUrl(buildId: number): Promise<string> {
    try {
      const response = await this.apiClient.sourceFilesApi.downloadReviewedSourceFiles(this.projectId, buildId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, 'Failed to get reviewed sources download URL');
    }
  }
}
