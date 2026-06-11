import type { Client, PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/CliError.ts';

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

  async add(
    request: SourceStringsModel.CreateStringRequest | SourceStringsModel.CreateStringStringsBasedRequest,
  ): Promise<SourceStringsModel.String> {
    try {
      const response = await this.client.sourceStringsApi.addString(this.projectId, request);

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Source string was not added');
    }
  }

  async batchEdit(patch: PatchRequest[]): Promise<void> {
    try {
      await this.client.sourceStringsApi.stringBatchOperations(this.projectId, patch);
    } catch (error) {
      throw toCliError(error, 'Failed to update source strings');
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
}
