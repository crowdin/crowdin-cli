import type { Client, PatchRequest, SourceStringsModel, Status } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/toCliError.ts';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';

export type UploadStringsProgress = (status: Status<SourceStringsModel.UploadStringsStatus>) => void;

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

  // Returns only once the server-side upload has finished. filePath names the file in the failure
  // message; onProgress reports each poll so the caller can print its own progress line.
  async uploadStrings(
    request: SourceStringsModel.UploadStringsRequest,
    filePath: string,
    onProgress?: UploadStringsProgress,
  ) {
    let response: Awaited<ReturnType<Client['sourceStringsApi']['uploadStrings']>>;

    try {
      response = await this.client.sourceStringsApi.uploadStrings(this.projectId, request);
    } catch (error) {
      throw toCliError(error, 'Failed to upload strings');
    }

    return await pollUntilFinished(
      response,
      (uploadId) => this.getUploadStringsStatus(uploadId),
      `Failed to upload strings for file ${filePath}`,
      onProgress,
    );
  }

  private async getUploadStringsStatus(uploadId: string) {
    try {
      return await this.client.sourceStringsApi.uploadStringsStatus(this.projectId, uploadId);
    } catch (error) {
      throw toCliError(error, 'Failed to get strings upload status');
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
