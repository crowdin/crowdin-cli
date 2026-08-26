import type { Client, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

/**
 * What `project add` sends. `identifier` is omitted deliberately — the API derives it from the
 * name, and the CLI never had a value that could satisfy its character rules.
 */
export type CreateProjectPayload =
  | ProjectsGroupsModel.CreateProjectEnterpriseRequest
  | Omit<ProjectsGroupsModel.CreateProjectRequest, 'identifier'>;

export class ProjectService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  isEnterprise(): boolean {
    return Boolean(this.apiClient.organization);
  }

  async addProject(data: CreateProjectPayload) {
    try {
      // The cast covers the omitted `identifier`, which the client types as required: the API
      // derives it from the name when it is absent, which is what Java's RequestBuilder.addProject
      // relies on — it never sends one.
      return await this.apiClient.projectsGroupsApi.addProject(data as ProjectsGroupsModel.CreateProjectRequest);
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
