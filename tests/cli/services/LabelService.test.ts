import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { LabelService } from '@/cli/services/LabelService.ts';

const PROJECT_ID = 123;

describe('LabelService', () => {
  let apiClient: Client;
  let labelService: LabelService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    labelService = new LabelService(apiClient, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('resolveLabelIds', () => {
    test('returns undefined for empty titles array', async () => {
      const result = await labelService.resolveLabelIds([]);
      expect(result).toBeUndefined();
    });

    test('returns ids for existing labels', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockResolvedValue({
        data: [{ data: { id: 1, title: 'bug' } }, { data: { id: 2, title: 'feature' } }],
      } as never);

      const result = await labelService.resolveLabelIds(['bug', 'feature']);

      expect(result).toEqual([1, 2]);
    });

    test('creates missing labels when createMissing=true', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockResolvedValue({
        data: [{ data: { id: 1, title: 'bug' } }],
      } as never);
      const addLabel = spyOn(apiClient.labelsApi, 'addLabel').mockResolvedValue({
        data: { id: 99, title: 'new-label' },
      } as never);

      const result = await labelService.resolveLabelIds(['bug', 'new-label'], true);

      expect(addLabel).toHaveBeenCalledWith(PROJECT_ID, { title: 'new-label' });
      expect(result).toEqual([1, 99]);
    });

    test('skips missing labels when createMissing=false', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockResolvedValue({
        data: [{ data: { id: 1, title: 'bug' } }],
      } as never);
      const addLabel = spyOn(apiClient.labelsApi, 'addLabel');

      const result = await labelService.resolveLabelIds(['bug', 'missing'], false);

      expect(addLabel).not.toHaveBeenCalled();
      expect(result).toEqual([1]);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockRejectedValue(new Error('unauthorized'));

      expect(labelService.resolveLabelIds(['bug'])).rejects.toThrow(CliError);
    });
  });

  describe('listLabelsMap', () => {
    test('returns id-to-title map', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockResolvedValue({
        data: [{ data: { id: 1, title: 'bug' } }, { data: { id: 2, title: 'feature' } }],
      } as never);

      const result = await labelService.listLabelsMap();

      expect(result.get(1)).toBe('bug');
      expect(result.get(2)).toBe('feature');
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.labelsApi, 'listLabels').mockRejectedValue(new Error('timeout'));

      expect(labelService.listLabelsMap()).rejects.toThrow(CliError);
    });
  });
});
