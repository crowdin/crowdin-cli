import type { Client } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import { normalizePath } from '../utils/parsing.ts';

export class DirectoryService {
  constructor(
    private apiClient: Client,
    private projectId: number,
  ) {}

  async loadProjectDirectories(branchId?: number) {
    try {
      return (
        await this.apiClient.sourceFilesApi.withFetchAll().listProjectDirectories(this.projectId, {
          branchId,
          recursion: '1', // TODO: Looks weird. API doc says should be integer or null
        })
      ).data;
    } catch (error) {
      throw toCliError(error, `Failed to list directories for project ${this.projectId}`);
    }
  }

  async createProjectDirectory(name: string, directoryId?: number, branchId?: number) {
    try {
      return await this.apiClient.sourceFilesApi.createDirectory(this.projectId, { name, directoryId, branchId });
    } catch (error) {
      throw toCliError(error, `Failed to create directory ${name}`);
    }
  }

  async deleteProjectDirectory(directoryId: number, directoryPath: string) {
    try {
      await this.apiClient.sourceFilesApi.deleteDirectory(this.projectId, directoryId);
    } catch (error) {
      throw toCliError(error, `Failed to delete directory ${directoryPath}`);
    }
  }

  async resolveDirectoryId(directoryPath: string | undefined, branchId?: number): Promise<number | undefined> {
    if (!directoryPath) {
      return undefined;
    }

    const expectedPath = normalizePath(directoryPath);
    const directories = await this.loadProjectDirectories(branchId);
    const directory = directories.find((entry) => normalizePath(entry.data.path) === expectedPath);

    if (!directory) {
      throw new CliError(`Project doesn't contain the '${directoryPath}' directory`);
    }

    return directory.data.id;
  }
}
