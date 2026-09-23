import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { StyleGuideService } from '@/cli/services/StyleGuideService.ts';

describe('StyleGuideService', () => {
  let apiClient: Client;
  let styleGuideService: StyleGuideService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    styleGuideService = new StyleGuideService(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('list', () => {
    const listStyleGuides = mock(async () => ({
      data: [
        { data: { id: 42, isShared: false, projectIds: [1] } },
        { data: { id: 43, isShared: false, projectIds: [2] } },
        { data: { id: 44, isShared: true, projectIds: null } },
        { data: { id: 45, isShared: false, projectIds: null } },
      ],
    }));

    beforeEach(() => {
      spyOn(apiClient.styleGuidesApi, 'withFetchAll').mockReturnValue({ listStyleGuides } as never);
    });

    test('keeps assigned and shared guides for the given project', async () => {
      expect((await styleGuideService.list(1)).map(({ id }) => id)).toEqual([42, 44]);
    });

    test('returns every guide without a project', async () => {
      expect((await styleGuideService.list()).map(({ id }) => id)).toEqual([42, 43, 44, 45]);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.styleGuidesApi, 'withFetchAll').mockReturnValue({
        listStyleGuides: mock(async () => {
          throw new Error('forbidden');
        }),
      } as never);

      expect(styleGuideService.list()).rejects.toThrow(new CliError('Failed to list style guides. forbidden'));
    });
  });

  describe('get', () => {
    test('returns style guide by id', async () => {
      spyOn(apiClient.styleGuidesApi, 'getStyleGuide').mockResolvedValue({ data: { id: 42 } } as never);

      expect(await styleGuideService.get(42)).toEqual({ id: 42 } as never);
      expect(apiClient.styleGuidesApi.getStyleGuide).toHaveBeenCalledWith(42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.styleGuidesApi, 'getStyleGuide').mockRejectedValue(new Error('not found'));

      expect(styleGuideService.get(42)).rejects.toThrow(new CliError('Failed to get style guide #42. not found'));
    });
  });

  describe('add', () => {
    const request = { name: 'Brand', storageId: 52 };

    test('creates style guide', async () => {
      spyOn(apiClient.styleGuidesApi, 'createStyleGuide').mockResolvedValue({ data: { id: 43 } } as never);

      expect(await styleGuideService.add(request)).toEqual({ id: 43 } as never);
      expect(apiClient.styleGuidesApi.createStyleGuide).toHaveBeenCalledWith(request);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.styleGuidesApi, 'createStyleGuide').mockRejectedValue(new Error('invalid'));

      expect(styleGuideService.add(request)).rejects.toThrow(
        new CliError("Failed to add style guide 'Brand'. invalid"),
      );
    });
  });

  describe('replaceFile', () => {
    test('patches the storage id', async () => {
      spyOn(apiClient.styleGuidesApi, 'editStyleGuide').mockResolvedValue({ data: { id: 42 } } as never);

      expect(await styleGuideService.replaceFile(42, 52)).toEqual({ id: 42 } as never);
      expect(apiClient.styleGuidesApi.editStyleGuide).toHaveBeenCalledWith(42, [
        { op: 'replace', path: '/storageId', value: 52 },
      ]);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.styleGuidesApi, 'editStyleGuide').mockRejectedValue(new Error('invalid'));

      expect(styleGuideService.replaceFile(42, 52)).rejects.toThrow(
        new CliError('Failed to update style guide #42. invalid'),
      );
    });
  });

  describe('delete', () => {
    test('deletes style guide by id', async () => {
      spyOn(apiClient.styleGuidesApi, 'deleteStyleGuide').mockResolvedValue(undefined);

      await styleGuideService.delete(42);

      expect(apiClient.styleGuidesApi.deleteStyleGuide).toHaveBeenCalledWith(42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.styleGuidesApi, 'deleteStyleGuide').mockRejectedValue(new Error('not found'));

      expect(styleGuideService.delete(42)).rejects.toThrow(new CliError('Failed to delete style guide #42. not found'));
    });
  });
});
