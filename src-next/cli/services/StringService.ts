import type { Client, PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';

export class StringService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async isStringsBasedProject(): Promise<boolean> {
    try {
      const project = await this.client.projectsGroupsApi.getProject(this.projectId);

      return project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project info');
    }
  }

  async list(params: SourceStringsModel.ListProjectStringsOptions): Promise<SourceStringsModel.String[]> {
    try {
      const response = await this.client.sourceStringsApi.withFetchAll().listProjectStrings(this.projectId, params);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list source strings');
    }
  }

  async add(request: SourceStringsModel.CreateStringRequest): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.addString(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Source string was not added');
    }
  }

  async addPlural(request: SourceStringsModel.CreateStringRequest): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.addString(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Source plural string was not added');
    }
  }

  async addStringsBased(
    request: SourceStringsModel.CreateStringStringsBasedRequest,
  ): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.addString(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Source string was not added');
    }
  }

  async addPluralStringsBased(
    request: SourceStringsModel.CreateStringStringsBasedRequest,
  ): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.addString(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Source plural string was not added');
    }
  }

  async edit(stringId: number, patch: PatchRequest[]): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.editString(this.projectId, stringId, patch);

      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to edit source string #${stringId}`);
    }
  }

  async delete(stringId: number): Promise<void> {
    try {
      await this.client.sourceStringsApi.deleteString(this.projectId, stringId);
    } catch (error) {
      throw toCliError(error, `Failed to delete source string #${stringId}`);
    }
  }

  async resolveLabelIds(titles: string[], createMissing: boolean): Promise<number[] | undefined> {
    if (titles.length === 0) {
      return undefined;
    }

    try {
      const labels = await this.listLabels();
      const idsByTitle = new Map(labels.map((label) => [label.title, label.id]));
      const result: number[] = [];

      for (const title of titles) {
        let id = idsByTitle.get(title);

        if (id === undefined && createMissing) {
          const label = await this.client.labelsApi.addLabel(this.projectId, { title });
          id = label.data.id;
          idsByTitle.set(title, id);
        }

        if (id !== undefined) {
          result.push(id);
        }
      }

      return result;
    } catch (error) {
      throw toCliError(error, 'Failed to resolve labels');
    }
  }

  async listLabelsMap(): Promise<Map<number, string>> {
    const labels = await this.listLabels();

    return new Map(labels.map((label) => [label.id, label.title]));
  }

  async resolveBranchId(name?: string, createMissing: boolean = false): Promise<number | undefined> {
    if (!name || name === 'none') {
      return undefined;
    }

    try {
      const branches = await this.client.sourceFilesApi.listProjectBranches(this.projectId, { name, limit: 500 });
      const branch = branches.data.find((entry) => entry.data.name === name);

      if (branch) {
        return branch.data.id;
      }

      if (!createMissing) {
        throw new CliError(`The branch '${name}' doesn't exist`);
      }

      const createdBranch = await this.client.sourceFilesApi.createBranch(this.projectId, { name });

      return createdBranch.data.id;
    } catch (error) {
      throw toCliError(error, `Failed to resolve branch ${name}`);
    }
  }

  async resolveDirectoryId(directoryPath?: string, branchId?: number): Promise<number | undefined> {
    if (!directoryPath) {
      return undefined;
    }

    const expectedPath = this.normalizePath(directoryPath);

    try {
      const response = await this.client.sourceFilesApi.listProjectDirectories(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        recursion: '1',
        limit: 500,
      });
      const directory = response.data.find((entry) => this.normalizePath(entry.data.path) === expectedPath);

      if (!directory) {
        throw new CliError(`Directory '${directoryPath}' not found`);
      }

      return directory.data.id;
    } catch (error) {
      throw toCliError(error, `Failed to resolve directory ${directoryPath}`);
    }
  }

  async resolveFileIds(rawPaths: string[], branchId?: number): Promise<{ fileIds: number[]; missingPaths: string[] }> {
    const normalizedPaths = rawPaths.map((rawPath) => this.normalizePath(rawPath));
    const fileIdsByPath = await this.loadFileIdsByPath(branchId);
    const fileIds: number[] = [];
    const missingPaths: string[] = [];

    normalizedPaths.forEach((path, index) => {
      const fileId = fileIdsByPath.get(path);
      const rawPath = rawPaths[index] ?? path;

      if (fileId === undefined) {
        missingPaths.push(rawPath);
        return;
      }

      fileIds.push(fileId);
    });

    return {
      fileIds: Array.from(new Set(fileIds)),
      missingPaths,
    };
  }

  async listProjectFilePaths(branchId?: number): Promise<Map<number, string>> {
    try {
      const files = await this.client.sourceFilesApi.listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        limit: 500,
      });

      return new Map(files.data.map((entry) => [entry.data.id, this.normalizePath(entry.data.path)]));
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  private async listLabels(): Promise<{ id: number; title: string }[]> {
    const response = await this.client.labelsApi.listLabels(this.projectId);

    return response.data.map((entry) => entry.data);
  }

  private async loadFileIdsByPath(branchId?: number): Promise<Map<string, number>> {
    try {
      const files = await this.client.sourceFilesApi.listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        limit: 500,
      });

      return new Map(files.data.map((entry) => [this.normalizePath(entry.data.path), entry.data.id]));
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  private normalizePath(path: string): string {
    return `/${path.replaceAll('\\', '/').replace(/^\/+/, '')}`;
  }
}
