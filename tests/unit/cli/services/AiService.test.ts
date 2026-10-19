import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { AiService } from '@/cli/services/AiService.ts';

describe('AiService', () => {
  const listAiUserPrompts = mock(async () => ({ data: [{ data: { id: 1 } }] }));
  const listAiOrganizationPrompts = mock(async () => ({ data: [{ data: { id: 2 } }] }));

  afterEach(() => {
    mock.restore();
    listAiUserPrompts.mockClear();
    listAiOrganizationPrompts.mockClear();
  });

  describe('on crowdin.com', () => {
    let apiClient: Client;

    beforeEach(() => {
      apiClient = new Client({ token: 'a'.repeat(80) });
      spyOn(apiClient.aiApi, 'withFetchAll').mockReturnValue({ listAiUserPrompts, listAiOrganizationPrompts } as never);
      spyOn(apiClient.usersApi, 'getAuthenticatedUser').mockResolvedValue({ data: { id: 7 } } as never);
    });

    test('lists the prompts of the authenticated user with the filters', async () => {
      const prompts = await new AiService(apiClient).listPrompts({ action: 'pre_translate', projectId: 3 });

      expect(prompts.map(({ id }) => id)).toEqual([1]);
      expect(listAiUserPrompts).toHaveBeenCalledWith(7, { action: 'pre_translate', projectId: 3 });
      expect(listAiOrganizationPrompts).not.toHaveBeenCalled();
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.usersApi, 'getAuthenticatedUser').mockRejectedValue(new Error('forbidden'));

      expect(new AiService(apiClient).listPrompts()).rejects.toThrow(
        new CliError('Failed to list AI prompts. forbidden'),
      );
    });
  });

  test('lists the organization prompts on Enterprise', async () => {
    const apiClient = new Client({ token: 'a'.repeat(80), organization: 'acme' });
    spyOn(apiClient.aiApi, 'withFetchAll').mockReturnValue({ listAiUserPrompts, listAiOrganizationPrompts } as never);
    const getAuthenticatedUser = spyOn(apiClient.usersApi, 'getAuthenticatedUser');

    const prompts = await new AiService(apiClient).listPrompts({ action: 'qa_check' });

    expect(prompts.map(({ id }) => id)).toEqual([2]);
    expect(listAiOrganizationPrompts).toHaveBeenCalledWith({ action: 'qa_check' });
    expect(listAiUserPrompts).not.toHaveBeenCalled();
    expect(getAuthenticatedUser).not.toHaveBeenCalled();
  });
});
