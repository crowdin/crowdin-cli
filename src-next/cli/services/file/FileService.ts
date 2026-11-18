import type { Client, PatchRequest, SourceFilesModel } from '@crowdin/crowdin-api-client';
import FileExistsError from '@/cli/errors/FileExistsError.ts';
import FileInUpdateError from '@/cli/errors/FileInUpdateError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { Output } from '@/cli/utils/output.ts';
import { normalizePath } from '@/cli/utils/parsing.ts';
import { withSpinner } from '@/cli/utils/withSpinner.ts';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { stripBranchPrefix } from '@/lib/utils/path.ts';
import { ProjectFileIndex } from './ProjectFileIndex.ts';

// The id scopes the request; the name is stripped off the returned paths.
type ProjectBranch = Pick<SourceFilesModel.Branch, 'id' | 'name'>;

// A project file path with its branch kept apart from the path instead of prefixed onto it.
export type ProjectFilePath = { path: string; branch?: string };

export interface ProjectFileUpdate {
  exportOptions?: SourceFilesModel.ExportOptions;
  importOptions?: SourceFilesModel.ImportOptions;
  updateOption?: SourceFilesModel.UpdateOption;
  attachLabelIds?: number[];
  excludedTargetLanguages?: string[];
  name?: string;
  context?: string;
}

export class FileService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async createProjectFile(data: SourceFilesModel.CreateFileRequest): Promise<SourceFilesModel.File> {
    try {
      return (await this.apiClient.sourceFilesApi.createFile(this.projectId, data)).data;
    } catch (error) {
      if (FileExistsError.matches(error)) {
        throw new FileExistsError();
      }

      throw toCliError(error, `Failed to create file '${data.name}'`);
    }
  }

  async updateProjectFile(
    fileId: number,
    storageId: number,
    localFilePath: string,
    update: ProjectFileUpdate = {},
  ): Promise<void> {
    const { exportOptions, importOptions, updateOption, attachLabelIds, excludedTargetLanguages, name, context } =
      update;

    try {
      // biome-ignore format: one argument per line
      await this.apiClient.sourceFilesApi.updateOrRestoreFile(
        this.projectId,
        fileId,
        {
          storageId,
          name,
          exportOptions,
          importOptions,
          updateOption,
          attachLabelIds,
        },
      );

      const patches: PatchRequest[] = [];

      if (excludedTargetLanguages !== undefined) {
        patches.push({ op: 'replace', path: '/excludedTargetLanguages', value: excludedTargetLanguages });
      }

      if (context !== undefined) {
        patches.push({ op: 'replace', path: '/context', value: context });
      }

      if (patches.length > 0) {
        await this.apiClient.sourceFilesApi.editFile(this.projectId, fileId, patches);
      }
    } catch (error) {
      if (FileInUpdateError.matches(error)) {
        throw new FileInUpdateError();
      }

      throw toCliError(error, `Failed to update '${localFilePath}'`);
    }
  }

  async deleteProjectFile(fileId: number, projectFilePath: string): Promise<void> {
    try {
      await this.apiClient.sourceFilesApi.deleteFile(this.projectId, fileId);
    } catch (error) {
      throw toCliError(error, `Failed to delete '${projectFilePath}'`);
    }
  }

  async resolveFileIds(
    rawPaths: string[],
    branch?: ProjectBranch,
  ): Promise<{ fileIds: number[]; missingPaths: string[] }> {
    const index = await this.loadQuietIndex(branch);
    const fileIds: number[] = [];
    const missingPaths: string[] = [];

    for (const rawPath of rawPaths) {
      const fileId = index.exact(rawPath)?.id;

      if (fileId === undefined) {
        missingPaths.push(rawPath);
        continue;
      }

      fileIds.push(fileId);
    }

    return { fileIds: Array.from(new Set(fileIds)), missingPaths };
  }

  // One branch, or the root tree without one: without a branchId the endpoint also returns every
  // branch's files, which would answer to their prefixed paths and look obsolete to delete-obsolete.
  async loadIndex(branch?: ProjectBranch): Promise<ProjectFileIndex> {
    const branchId = branch?.id;
    const response = await withSpinner(
      this.output,
      'projectFiles',
      { start: 'Fetching project files', stop: 'Project files fetched', fail: 'Failed to fetch project files' },
      // biome-ignore format: one argument per line
      () => this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(
        this.projectId,
        {
          branchId,
          recursion: '1',
        },
      ),
    );
    const files = response.data
      .map((entry) => entry.data)
      .filter((file) => (file.branchId ?? null) === (branchId ?? null));

    return new ProjectFileIndex(files, branch?.name);
  }

  // Same files as loadIndex, without its spinner. Branch files stay out unless '--branch' names the
  // branch: '--file' never carries it, so two branches' copies of a path would collide.
  private async loadQuietIndex(branch?: ProjectBranch): Promise<ProjectFileIndex> {
    const files = await this.fetchProjectFiles(branch?.id);
    return new ProjectFileIndex(branch ? files : files.filter((file) => file.branchId == null), branch?.name);
  }

  // Unlike the index, keeps every branch's files: it labels strings already fetched, and dropping a
  // branch would leave its strings without a path. The branch is its own field, not a path prefix.
  async listProjectFilePaths(branch?: ProjectBranch): Promise<Map<number, ProjectFilePath>> {
    const files = await this.fetchProjectFiles(branch?.id);

    return new Map(
      files.map((file) => {
        // Without '--branch', a branch file's first path segment is its branch name.
        const branchName = file.branchId == null ? undefined : (branch?.name ?? this.firstPathSegment(file.path));
        return [file.id, { path: this.toLookupPath(file.path, branchName), branch: branchName }];
      }),
    );
  }

  private async fetchProjectFiles(branchId?: number): Promise<SourceFilesModel.File[]> {
    try {
      const response = await this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        recursion: '1',
      });

      // Nested files carry their branchId too, so it alone tells whether a file sits in a branch.
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  private firstPathSegment(projectPath: string): string | undefined {
    return normalizePath(projectPath).split('/')[1];
  }

  // '--file' never carries the branch, so lookups compare branch-relative paths.
  private toLookupPath(projectPath: string, branchName?: string): string {
    return stripBranchPrefix(normalizePath(projectPath), branchName);
  }

  async getSourceFileDownloadUrl(fileId: number): Promise<string> {
    try {
      const response = await this.apiClient.sourceFilesApi.downloadFile(this.projectId, fileId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, `Failed to get download URL for file ${fileId}`);
    }
  }

  async buildReviewedSources(branchId?: number): Promise<SourceFilesModel.ReviewedSourceFilesBuild> {
    return await withSpinner(
      this.output,
      'reviewedBuild',
      {
        start: 'Building reviewed sources...',
        stop: 'Reviewed sources built',
        fail: 'Failed to build reviewed sources',
      },
      async () => {
        const build = await this.apiClient.sourceFilesApi.buildReviewedSourceFiles(this.projectId, { branchId });

        // Keyed by the build id, not a status identifier, so the poll closure ignores its argument.
        await pollUntilFinished(
          build,
          () => this.apiClient.sourceFilesApi.checkReviewedSourceFilesBuildStatus(this.projectId, build.data.id),
          'Reviewed sources build failed',
        );

        return build.data;
      },
    );
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
