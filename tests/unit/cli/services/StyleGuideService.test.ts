import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
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
  });
});
