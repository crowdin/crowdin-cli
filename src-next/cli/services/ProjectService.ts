import type { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
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
      const cliError = toCliError(error, 'Failed to fetch project info');

      this.output.spinner('project', 'error', cliError.message);

      cliError.reported = true;
      throw cliError;
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
      const cliError = toCliError(error, 'Failed to fetch projects');

      this.output.spinner('projects', 'error', cliError.message);

      cliError.reported = true;
      throw cliError;
    }
  }
}
