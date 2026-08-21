import { type Client, CrowdinError, type ScreenshotsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/toCliError.ts';

export type ScreenshotView = ScreenshotsModel.Screenshot;

export interface ScreenshotListFilters {
  stringIds?: number[];
  search?: string;
  labelIds?: number[];
  excludeLabelIds?: number[];
}

export class ScreenshotService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(filters: ScreenshotListFilters = {}): Promise<ScreenshotView[]> {
    const { stringIds, search, labelIds, excludeLabelIds } = filters;

    try {
      const response = await this.client.screenshotsApi.withFetchAll().listScreenshots(this.projectId, {
        ...(stringIds?.length ? { stringIds } : {}),
        ...(search !== undefined ? { search } : {}),
        ...(labelIds?.length ? { labelIds: labelIds.join(',') } : {}),
        ...(excludeLabelIds?.length ? { excludeLabelIds: excludeLabelIds.join(',') } : {}),
      });

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list screenshots');
    }
  }

  async findAllByName(name: string): Promise<ScreenshotView[]> {
    try {
      const response = await this.client.screenshotsApi.withFetchAll().listScreenshots(this.projectId, {
        search: name,
      });

      // `search` matches substrings of names, tagged strings and file names, so keep exact name matches only
      return response.data
        .map((entry) => entry.data)
        .filter((screenshot) => screenshot.name === name)
        .sort((left, right) => left.id - right.id);
    } catch (error) {
      throw toCliError(error, `Failed to find screenshot '${name}'`);
    }
  }

  async get(id: number): Promise<ScreenshotView | null> {
    try {
      const response = await this.client.screenshotsApi.getScreenshot(this.projectId, id);
      return response.data;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }

      throw toCliError(error, `Failed to fetch screenshot by id ${id}`);
    }
  }

  async upload(request: ScreenshotsModel.CreateScreenshotRequest): Promise<ScreenshotView> {
    try {
      const response = await this.client.screenshotsApi.addScreenshot(this.projectId, request);
      return response.data;
    } catch (error) {
      throw toCliError(error, 'Screenshot was not uploaded');
    }
  }

  async update(id: number, request: ScreenshotsModel.UpdateScreenshotRequest): Promise<ScreenshotView> {
    try {
      const response = await this.client.screenshotsApi.updateScreenshot(this.projectId, id, request);
      return response.data;
    } catch (error) {
      throw toCliError(error, 'Screenshot was not updated');
    }
  }

  async replaceLabels(id: number, labelIds: number[]): Promise<ScreenshotView> {
    try {
      // labelIds is not part of the update form, only the patch one
      const response = await this.client.screenshotsApi.editScreenshot(this.projectId, id, [
        { op: 'replace', path: '/labelIds', value: labelIds },
      ]);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to update labels for screenshot #${id}`);
    }
  }

  async replaceTags(id: number, request: ScreenshotsModel.AutoTagRequest): Promise<void> {
    try {
      await this.client.screenshotsApi.replaceTags(this.projectId, id, request);
    } catch (error) {
      throw toCliError(error, `Failed to replace tags for screenshot #${id}`);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.client.screenshotsApi.deleteScreenshot(this.projectId, id);
    } catch (error) {
      throw toCliError(error, `Failed to delete screenshot #${id}`);
    }
  }

  isAutoTagInProgressError(error: unknown): boolean {
    if (error instanceof CrowdinError) {
      return Number(error.code) === 409 && error.message.includes('Auto tag is currently in progress');
    }

    if (error instanceof Error) {
      return error.message.includes('Auto tag is currently in progress');
    }

    return false;
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof CrowdinError && Number(error.code) === 404;
  }
}
