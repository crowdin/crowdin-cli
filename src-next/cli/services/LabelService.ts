import type { Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/CliError.ts';

export class LabelService {
  constructor(
    private apiClient: Client,
    private projectId: number,
  ) {}

  async resolveLabelIds(titles: string[], createMissing: boolean = true): Promise<number[] | undefined> {
    if (titles.length === 0) {
      return undefined;
    }

    try {
      const labels = await this.apiClient.labelsApi.listLabels(this.projectId);
      const labelIdsByTitle = new Map(labels.data.map((label) => [label.data.title, label.data.id]));
      const labelIds: number[] = [];

      for (const title of titles) {
        let labelId = labelIdsByTitle.get(title);

        if (labelId === undefined && createMissing) {
          const label = await this.apiClient.labelsApi.addLabel(this.projectId, { title });
          labelId = label.data.id;
          labelIdsByTitle.set(title, labelId);
        }

        if (labelId !== undefined) {
          labelIds.push(labelId);
        }
      }

      return labelIds;
    } catch (error) {
      throw toCliError(error, 'Failed to resolve labels');
    }
  }

  async listLabelsMap(): Promise<Map<number, string>> {
    try {
      const response = await this.apiClient.labelsApi.listLabels(this.projectId);
      return new Map(response.data.map((entry) => [entry.data.id, entry.data.title]));
    } catch (error) {
      throw toCliError(error, 'Failed to fetch labels');
    }
  }
}
