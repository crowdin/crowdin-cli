import type Client from '../../lib/api/client.ts';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';

export class ProjectService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {
  }

  progress = {
    loadProjectProgress: async () => {
      this.output.spinner('projectProgress', 'start', 'Fetching project progress');

      try {
        const projectProgress = await this.apiClient.getProjectProgress(this.projectId);

        this.output.spinner('projectProgress', 'stop', 'Project progress fetched');

        return projectProgress;
      } catch (error) {
        const message = this.getErrorMessage('Failed to fetch project progress', error);
        this.output.spinner('projectProgress', 'error', message);
        throw new CliError(message, 1, true);
      }
    }
  };

  file = {
    updateProjectFile: async (fileId: number, storageId: number, localFilePath: string) => {
      try {
        await this.apiClient.updateProjectFile(this.projectId, fileId, storageId);
      } catch (error) {
        throw toCliError(error, `Failed to update ${localFilePath}`);
      }
    }
  }

  directory = {
    loadProjectDirectories: async () => {
      try {
        return (await this.apiClient.listProjectDirectories(this.projectId)).data;
      } catch (error) {
        throw toCliError(error, `Failed to list directories for project ${this.projectId}`);
      }
    },
    createProjectDirectory: async (name: string, directoryId?: number) => {
      try {
        const result = await this.apiClient.createProjectDirectory(this.projectId, name, directoryId);

        this.output.success(`Directory ${name} created`);

        return result;
      } catch (error) {
        throw toCliError(error, `Failed to create directory ${name}`);
      }
    }
  }

  translation = {
    importProjectTranslation: async (storageId: number, fileId: number, languageIds: string[], filePath: string) => {
      try {
        await this.apiClient.importProjectTranslation(this.projectId, storageId, fileId, languageIds);
      } catch (error) {
        throw toCliError(error, `Failed to import translations for file ${filePath}`);
      }
    },
    buildProjectTranslations: async (languageIds: string[]) => {
      this.output.spinner('build', 'start', 'Building translations...');

      try {
        const build = await this.apiClient.buildProjectTranslations(this.projectId, languageIds);

        while (true) {
          const buildProgress = await this.apiClient.getProjectTranslationsBuildStatus(this.projectId, build.data.id);

          if (buildProgress.data.status === 'finished') {
            break;
          }

          await Bun.sleep(2000);
        }

        this.output.spinner('build', 'stop', 'Translations built');
        return build;
      } catch (error) {
        this.output.spinner('build', 'error', 'Translations build failed');
        throw toCliError(error, 'Failed to build project translations');
      }
    }
  }

  async loadProject() {
    this.output.spinner('project', 'start', 'Fetching project info');

    try {
      const project = await this.apiClient.getProject(this.projectId);

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
      const projects = await this.apiClient.listProjects(hasManagerAccess);

      this.output.spinner('projects', 'stop', 'Projects fetched');

      return projects;
    } catch (error) {
      const message = this.getErrorMessage('Failed to fetch projects', error);

      this.output.spinner('projects', 'error', message);
      throw new CliError(message, 1, true);
    }
  }

  async loadProjectFiles() {
    this.output.spinner('projectFiles', 'start', 'Fetching project files');

    try {
      const projectFiles = await this.apiClient.listProjectFiles(this.projectId);

      this.output.spinner('projectFiles', 'stop', 'Project files fetched');

      return projectFiles;
    } catch (error) {
      const message = this.getErrorMessage('Failed to fetch project files', error);

      this.output.spinner('projectFiles', 'error', message);
      throw new CliError(message, 1, true);
    }
  }

  private getErrorMessage(prefix: string, error: unknown): string {
    if (error instanceof Error) {
      return `${prefix}. ${error.message}`;
    }

    return prefix;
  }
}
