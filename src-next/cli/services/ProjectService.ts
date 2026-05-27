import type { Client, TranslationsModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';

export class ProjectService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  progress = {
    loadProjectProgress: async () => {
      this.output.spinner('projectProgress', 'start', 'Fetching project progress');

      try {
        const projectProgress = await this.apiClient.translationStatusApi.getProjectProgress(this.projectId);

        this.output.spinner('projectProgress', 'stop', 'Project progress fetched');

        return projectProgress;
      } catch (error) {
        const message = this.getErrorMessage('Failed to fetch project progress', error);
        this.output.spinner('projectProgress', 'error', message);
        throw new CliError(message, 1, true);
      }
    },
    loadBranchProgress: async (branchId: number) => {
      try {
        return await this.apiClient.translationStatusApi.getBranchProgress(this.projectId, branchId);
      } catch (error) {
        throw toCliError(error, `Failed to fetch branch progress for branch ${branchId}`);
      }
    },
    loadFileProgress: async (fileId: number) => {
      try {
        return await this.apiClient.translationStatusApi.getFileProgress(this.projectId, fileId);
      } catch (error) {
        throw toCliError(error, `Failed to fetch file progress for file ${fileId}`);
      }
    },
    loadDirectoryProgress: async (directoryId: number) => {
      try {
        return await this.apiClient.translationStatusApi.getDirectoryProgress(this.projectId, directoryId);
      } catch (error) {
        throw toCliError(error, `Failed to fetch directory progress for directory ${directoryId}`);
      }
    },
  };

  file = {
    updateProjectFile: async (
      fileId: number,
      storageId: number,
      localFilePath: string,
      exportPattern?: string,
      attachLabelIds?: number[],
      excludedTargetLanguages?: string[],
    ) => {
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
    },
    deleteProjectFile: async (fileId: number, projectFilePath: string) => {
      try {
        await this.apiClient.sourceFilesApi.deleteFile(this.projectId, fileId);
      } catch (error) {
        throw toCliError(error, `Failed to delete ${projectFilePath}`);
      }
    },
  };

  label = {
    resolveLabelIds: async (titles: string[]) => {
      if (titles.length === 0) {
        return undefined;
      }

      try {
        const labels = await this.apiClient.labelsApi.listLabels(this.projectId);
        const labelIdsByTitle = new Map(labels.data.map((label) => [label.data.title, label.data.id]));
        const labelIds: number[] = [];

        for (const title of titles) {
          let labelId = labelIdsByTitle.get(title);

          if (labelId === undefined) {
            const label = await this.apiClient.labelsApi.addLabel(this.projectId, { title });
            labelId = label.data.id;
            labelIdsByTitle.set(title, labelId);
          }

          labelIds.push(labelId);
        }

        return labelIds;
      } catch (error) {
        throw toCliError(error, 'Failed to resolve labels');
      }
    },
  };

  directory = {
    loadProjectDirectories: async (branchId?: number) => {
      try {
        return (
          await this.apiClient.sourceFilesApi.listProjectDirectories(this.projectId, {
            branchId,
            recursion: '1', // TODO: Looks weird. API doc says should be integer or null
            limit: 500,
          })
        ).data;
      } catch (error) {
        throw toCliError(error, `Failed to list directories for project ${this.projectId}`);
      }
    },
    createProjectDirectory: async (name: string, directoryId?: number, branchId?: number) => {
      try {
        return await this.apiClient.sourceFilesApi.createDirectory(this.projectId, { name, directoryId, branchId });
      } catch (error) {
        throw toCliError(error, `Failed to create directory ${name}`);
      }
    },
    deleteProjectDirectory: async (directoryId: number, directoryPath: string) => {
      try {
        await this.apiClient.sourceFilesApi.deleteDirectory(this.projectId, directoryId);
      } catch (error) {
        throw toCliError(error, `Failed to delete directory ${directoryPath}`);
      }
    },
  };

  branch = {
    getBranch: async (name?: string) => {
      if (!name || name === 'none') {
        return undefined;
      }

      try {
        const branches = await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId, { name, limit: 500 });
        return branches.data.find((branch) => branch.data.name === name)?.data;
      } catch (error) {
        throw toCliError(error, `Failed to find branch ${name}`);
      }
    },
    getOrCreateBranch: async (name?: string) => {
      if (!name || name === 'none') {
        return undefined;
      }

      try {
        const branches = await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId, { name, limit: 500 });
        const existingBranch = branches.data.find((branch) => branch.data.name === name);

        if (existingBranch !== undefined) {
          return existingBranch.data;
        }

        return (await this.apiClient.sourceFilesApi.createBranch(this.projectId, { name })).data;
      } catch (error) {
        throw toCliError(error, `Failed to resolve branch ${name}`);
      }
    },
  };

  translation = {
    importProjectTranslation: async (
      storageId: number,
      fileId: number,
      languageIds: string[],
      filePath: string,
      autoApproveImported?: boolean,
      importEqSuggestions?: boolean,
      translateHidden?: boolean,
    ) => {
      try {
        await this.apiClient.translationsApi.importTranslations(this.projectId, {
          storageId,
          fileId,
          languageIds,
          autoApproveImported,
          importEqSuggestions,
          translateHidden,
        });
      } catch (error) {
        throw toCliError(error, `Failed to import translations for file ${filePath}`);
      }
    },
    buildProjectTranslations: async (
      request?: TranslationsModel.BuildRequest | TranslationsModel.PseudoBuildRequest,
    ) => {
      this.output.spinner('build', 'start', 'Building translations...');

      try {
        const build = await this.apiClient.translationsApi.buildProject(this.projectId, request);

        while (true) {
          const buildProgress = await this.apiClient.translationsApi.checkBuildStatus(this.projectId, build.data.id);

          if (buildProgress.data.status === 'finished') {
            break;
          }

          if (buildProgress.data.status === 'failed') {
            throw new CliError('Translations build failed');
          }

          await Bun.sleep(2000);
        }

        this.output.spinner('build', 'stop', 'Translations built');

        return build;
      } catch (error) {
        this.output.spinner('build', 'error', 'Translations build failed');
        throw toCliError(error, 'Failed to build project translations');
      }
    },
  };

  async loadProject() {
    this.output.spinner('project', 'start', 'Fetching project info');

    try {
      const project = await this.apiClient.projectsGroupsApi.getProject(this.projectId);

      this.output.spinner('project', 'stop', 'Project info fetched');

      return project;
    } catch (error) {
      const message = this.getErrorMessage('Failed to fetch project info', error);

      this.output.spinner('project', 'error', message);
      throw new CliError(message, 1, true);
    }
  }

  async loadProjects(hasManagerAccess: boolean) {
    this.output.spinner('projects', 'start', 'Fetching projects');

    try {
      const projects = await this.apiClient.projectsGroupsApi.withFetchAll().listProjects({
        hasManagerAccess: +hasManagerAccess,
      });

      this.output.spinner('projects', 'stop', 'Projects fetched');

      return projects;
    } catch (error) {
      const message = this.getErrorMessage('Failed to fetch projects', error);

      this.output.spinner('projects', 'error', message);
      throw new CliError(message, 1, true);
    }
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
      const message = this.getErrorMessage('Failed to fetch project files', error);

      this.output.spinner('projectFiles', 'error', message);
      throw new CliError(message, 1, true);
    }
  }

  async loadProjectBranches() {
    try {
      return await this.apiClient.sourceFilesApi.listProjectBranches(this.projectId);
    } catch (error) {
      throw toCliError(error, `Failed to fetch branches for project ${this.projectId}`);
    }
  }

  private getErrorMessage(prefix: string, error: unknown): string {
    if (error instanceof Error) {
      return `${prefix}. ${error.message}`;
    }

    return prefix;
  }
}
