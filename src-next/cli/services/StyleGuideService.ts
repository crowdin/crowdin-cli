import type { Client, StyleGuidesModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';

export class StyleGuideService {
  constructor(private apiClient: Client) {}

  // A shared guide applies to every project, so it counts as assigned.
  async list(projectId?: number): Promise<StyleGuidesModel.StyleGuide[]> {
    try {
      const response = await this.apiClient.styleGuidesApi.withFetchAll().listStyleGuides();
      const guides = response.data.map((entry) => entry.data);

      if (projectId === undefined) {
        return guides;
      }

      return guides.filter(({ isShared, projectIds }) => isShared || projectIds?.includes(projectId));
    } catch (error) {
      throw toCliError(error, 'Failed to list style guides');
    }
  }

  async get(id: number): Promise<StyleGuidesModel.StyleGuide> {
    try {
      const response = await this.apiClient.styleGuidesApi.getStyleGuide(id);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to get style guide #${id}`);
    }
  }

  async add(request: StyleGuidesModel.CreateStyleGuideRequest): Promise<StyleGuidesModel.StyleGuide> {
    try {
      const response = await this.apiClient.styleGuidesApi.createStyleGuide(request);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to add style guide '${request.name}'`);
    }
  }

  async replaceFile(id: number, storageId: number): Promise<StyleGuidesModel.StyleGuide> {
    try {
      const response = await this.apiClient.styleGuidesApi.editStyleGuide(id, [
        { op: 'replace', path: '/storageId', value: storageId },
      ]);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to update style guide #${id}`);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.apiClient.styleGuidesApi.deleteStyleGuide(id);
    } catch (error) {
      throw toCliError(error, `Failed to delete style guide #${id}`);
    }
  }
}
