import type { Client, SourceFilesModel } from '@crowdin/crowdin-api-client';
import { stripBranchPrefix } from '@/lib/utils/path.ts';
import CliError from '../errors/CliError.ts';
import { toCliError } from '../errors/toCliError.ts';
import { normalizePath } from '../utils/parsing.ts';

export class DirectoryService {
  constructor(
    private apiClient: Client,
    private projectId: number,
  ) {}

  // Scoped to one branch, and to the root tree when none is given — see FileService.loadProjectFiles.
  async loadProjectDirectories(branchId?: number) {
    try {
      return (
        await this.apiClient.sourceFilesApi.withFetchAll().listProjectDirectories(this.projectId, {
          branchId,
          recursion: '1',
        })
      ).data.filter((directory) => (directory.data.branchId ?? null) === (branchId ?? null));
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
      throw toCliError(error, `Failed to delete directory '${directoryPath}'`);
    }
  }

  // Server paths carry the branch name, the path given on the command line never does — the same
  // branch-relative addressing FileService.resolveFileIds uses for '--file'.
  async resolveDirectoryId(
    directoryPath: string | undefined,
    branch?: Pick<SourceFilesModel.Branch, 'id' | 'name'>,
  ): Promise<number | undefined> {
    if (!directoryPath) {
      return undefined;
    }

    const expectedPath = normalizePath(directoryPath);
    const directories = await this.loadProjectDirectories(branch?.id);
    const directory = directories.find(
      (entry) => stripBranchPrefix(normalizePath(entry.data.path), branch?.name) === expectedPath,
    );

    if (!directory) {
      throw new CliError(`Project doesn't contain the '${directoryPath}' directory`);
    }

    return directory.data.id;
  }
}
