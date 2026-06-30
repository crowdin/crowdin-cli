import type { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import CliError from '../errors/CliError.ts';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';

export class ProjectService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  isEnterprise(): boolean {
    return Boolean(this.apiClient.organization);
  }

  async addProject(
    data: ProjectsGroupsModel.CreateProjectEnterpriseRequest | ProjectsGroupsModel.CreateProjectRequest,
  ) {
    try {
      return await this.apiClient.projectsGroupsApi.addProject(data);
    } catch (error) {
      throw toCliError(error, 'Failed to add project');
    }
  }

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

  private getErrorMessage(prefix: string, error: unknown): string {
    if (error instanceof Error) {
      return `${prefix}. ${error.message}`;
    }

    return prefix;
  }
}
