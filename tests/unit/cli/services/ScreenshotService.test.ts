import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import { ScreenshotService } from '@/cli/services/ScreenshotService.ts';

const PROJECT_ID = 123;

describe('ScreenshotService', () => {
  let apiClient: Client;
  let screenshotService: ScreenshotService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    screenshotService = new ScreenshotService(apiClient, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('list', () => {
    test('maps filters to API params, using stringIds over the deprecated stringId', async () => {
      const listScreenshots = spyOn(apiClient.screenshotsApi, 'listScreenshots').mockResolvedValue({
        data: [{ data: { id: 1, name: 'login.png' } }],
      } as never);

      await screenshotService.list({ stringIds: [42, 43], search: 'login', labelIds: [1, 2], excludeLabelIds: [3] });

      expect(listScreenshots).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ stringIds: [42, 43], search: 'login', labelIds: '1,2', excludeLabelIds: '3' }),
      );
    });
  });

  describe('findAllByName', () => {
    test('keeps only exact name matches, ordered by id', async () => {
      spyOn(apiClient.screenshotsApi, 'listScreenshots').mockResolvedValue({
        data: [
          { data: { id: 3, name: 'old-page.png' } },
          { data: { id: 9, name: 'login.png' } },
          { data: { id: 5, name: 'login.png' } },
          { data: { id: 7, name: 'login-form.png' } },
        ],
      } as never);

      const result = await screenshotService.findAllByName('login.png');

      expect(result.map((screenshot) => screenshot.id)).toEqual([5, 9]);
    });

    test('returns empty list when only fuzzy matches exist', async () => {
      spyOn(apiClient.screenshotsApi, 'listScreenshots').mockResolvedValue({
        data: [{ data: { id: 3, name: 'checkout.png' } }],
      } as never);

      expect(await screenshotService.findAllByName('login.png')).toEqual([]);
    });
  });

  test('get returns the screenshot', async () => {
    const getScreenshot = spyOn(apiClient.screenshotsApi, 'getScreenshot').mockResolvedValue({
      data: { id: 5 },
    } as never);

    expect(await screenshotService.get(5)).toEqual({ id: 5 } as never);
    expect(getScreenshot).toHaveBeenCalledWith(PROJECT_ID, 5);
  });

  test('upload returns the created screenshot', async () => {
    const request = { storageId: 9, name: 'home.png' } as never;
    const addScreenshot = spyOn(apiClient.screenshotsApi, 'addScreenshot').mockResolvedValue({
      data: { id: 5 },
    } as never);

    expect(await screenshotService.upload(request)).toEqual({ id: 5 } as never);
    expect(addScreenshot).toHaveBeenCalledWith(PROJECT_ID, request);
  });

  test('update returns the updated screenshot', async () => {
    const request = { storageId: 9, name: 'home.png' } as never;
    const updateScreenshot = spyOn(apiClient.screenshotsApi, 'updateScreenshot').mockResolvedValue({
      data: { id: 5 },
    } as never);

    expect(await screenshotService.update(5, request)).toEqual({ id: 5 } as never);
    expect(updateScreenshot).toHaveBeenCalledWith(PROJECT_ID, 5, request);
  });

  test('replaceLabels patches the label ids', async () => {
    const editScreenshot = spyOn(apiClient.screenshotsApi, 'editScreenshot').mockResolvedValue({
      data: { id: 5 },
    } as never);

    expect(await screenshotService.replaceLabels(5, [1, 2])).toEqual({ id: 5 } as never);
    expect(editScreenshot).toHaveBeenCalledWith(PROJECT_ID, 5, [{ op: 'replace', path: '/labelIds', value: [1, 2] }]);
  });
});
