import type { Client, PatchRequest, SourceFilesModel } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { stripBranchPrefix } from '@/lib/utils/path.ts';
import FileExistsError from '../errors/FileExistsError.ts';
import FileInUpdateError from '../errors/FileInUpdateError.ts';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { normalizePath } from '../utils/parsing.ts';
import { withSpinner } from '../utils/withSpinner.ts';

// Only the id and the name matter here: the id scopes the request, the name comes back off every
// path the request returns.
type ProjectBranch = Pick<SourceFilesModel.Branch, 'id' | 'name'>;

/** A project file path with its branch kept apart from the path instead of prefixed onto it. */
export type ProjectFilePath = { path: string; branch?: string };

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
    exportOptions?: SourceFilesModel.ExportOptions,
    importOptions?: SourceFilesModel.ImportOptions,
    updateOption?: SourceFilesModel.UpdateOption,
    attachLabelIds?: number[],
    excludedTargetLanguages?: string[],
    name?: string,
    context?: string,
  ) {
    try {
      await this.apiClient.sourceFilesApi.updateOrRestoreFile(this.projectId, fileId, {
        storageId,
        name,
        exportOptions,
        importOptions,
        updateOption,
        attachLabelIds,
      });

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

  async deleteProjectFile(fileId: number, projectFilePath: string) {
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
    const fileIdsByPath = await this.loadFileIdsByPath(branch);
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

  // Scoped to one branch, and to the root tree when none is given: without a branchId the endpoint
  // returns every branch's files too, whose paths carry the branch name, so they would answer to
  // their prefixed path everywhere below (and 'upload sources --delete-obsolete' would delete them
  // as obsolete). Java scopes the same way, by equality that treats null as the root
  // (CrowdinProjectFull.getFiles(branchId)).
  async loadProjectFiles(branchId?: number) {
    const response = await withSpinner(
      this.output,
      'projectFiles',
      { start: 'Fetching project files', stop: 'Project files fetched', fail: 'Failed to fetch project files' },
      () => this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(this.projectId, { branchId, recursion: '1' }),
    );

    return {
      ...response,
      data: response.data.filter((file) => (file.data.branchId ?? null) === (branchId ?? null)),
    };
  }

  // A file inside a branch is addressable only once '--branch' names that branch: the branch is
  // never part of '--file', and without one every path would silently resolve against whichever
  // branch happened to be listed first.
  //
  // This is a deliberate deviation, not parity: Java (StringAddAction) keeps branch files in the
  // lookup even with no branch given and builds their keys off the directory tree alone
  // (ProjectFilesUtils.buildFilePaths without branches), so two branches holding the same relative
  // path collide and the last one into the HashMap wins. Dropping them is the whole point here —
  // don't "restore parity" by deleting the filter.
  private async loadFileIdsByPath(branch?: ProjectBranch): Promise<Map<string, number>> {
    const files = await this.fetchProjectFiles(branch?.id);
    const addressable = branch ? files : files.filter((file) => file.branchId === null);

    return new Map(addressable.map((file) => [this.toLookupPath(file.path, branch?.name), file.id]));
  }

  // Unlike the lookup above this keeps branch files, because it labels strings that were already
  // fetched rather than addressing one: dropping them would leave those strings without a path.
  // The branch travels as its own field instead of a path prefix, so a caller can tell two
  // branches' copies of the same file apart without parsing the path.
  async listProjectFilePaths(branch?: ProjectBranch): Promise<Map<number, ProjectFilePath>> {
    const files = await this.fetchProjectFiles(branch?.id);

    return new Map(
      files.map((file) => {
        // A branch file's server path starts with its branch name, so with no '--branch' to name it
        // the first segment is the branch — no second request to list them.
        const branchName = file.branchId === null ? undefined : (branch?.name ?? this.firstPathSegment(file.path));

        return [file.id, { path: this.toLookupPath(file.path, branchName), branch: branchName }];
      }),
    );
  }

  private async fetchProjectFiles(
    branchId?: number,
  ): Promise<Array<{ id: number; path: string; branchId: number | null }>> {
    try {
      const response = await this.apiClient.sourceFilesApi.withFetchAll().listProjectFiles(this.projectId, {
        ...(branchId !== undefined ? { branchId } : {}),
        recursion: '1',
      });

      // Files nested in a branch's directories carry their branchId too, so it alone says whether
      // a file sits in a branch — no walking the directory chain up to one.
      return response.data.map((entry) => ({
        id: entry.data.id,
        path: entry.data.path,
        branchId: entry.data.branchId ?? null,
      }));
    } catch (error) {
      throw toCliError(error, 'Failed to fetch project files');
    }
  }

  // Server paths carry the branch name, the path given on the command line never does, so '--file'
  // stays branch-relative and the branch only arrives through '--branch'. Branch-relative keys do
  // match Java, which builds them off the directory tree alone; what differs is which files reach
  // the lookup at all (see loadFileIdsByPath).
  private firstPathSegment(projectPath: string): string | undefined {
    return normalizePath(projectPath).split('/')[1];
  }

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

  async buildReviewedSources(branchId?: number) {
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

        // Keyed by the build id rather than a status identifier, so the poll closure ignores its
        // argument and closes over the build instead.
        await pollUntilFinished(
          build,
          () => this.apiClient.sourceFilesApi.checkReviewedSourceFilesBuildStatus(this.projectId, build.data.id),
          'Reviewed sources build failed',
        );

        return build;
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
