import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import { TaskService } from '@/cli/services/TaskService.ts';

const PROJECT_ID = 123;

describe('TaskService', () => {
  afterEach(() => {
    mock.restore();
  });

  test('add returns the created task', async () => {
    const apiClient = new Client({ token: 'a'.repeat(80) });
    const request = { title: 'Translate', languageId: 'fr' } as never;
    const addTask = spyOn(apiClient.tasksApi, 'addTask').mockResolvedValue({ data: { id: 8 } } as never);

    const task = await new TaskService(apiClient, PROJECT_ID).add(request);

    expect(task).toEqual({ id: 8 } as never);
    expect(addTask).toHaveBeenCalledWith(PROJECT_ID, request);
  });
});
