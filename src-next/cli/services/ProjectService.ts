import type { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

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
    return await withSpinner(
      this.output,
      'project',
      { start: 'Fetching project info', stop: 'Project info fetched', fail: 'Failed to fetch project info' },
      () => this.apiClient.projectsGroupsApi.getProject(this.projectId),
    );
  }

  async loadProjects(hasManagerAccess: boolean) {
    return await withSpinner(
      this.output,
      'projects',
      { start: 'Fetching projects', stop: 'Projects fetched', fail: 'Failed to fetch projects' },
      () => this.apiClient.projectsGroupsApi.withFetchAll().listProjects({ hasManagerAccess: +hasManagerAccess }),
    );
  }
}
