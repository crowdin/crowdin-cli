import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { LanguageService } from '@/cli/services/LanguageService.ts';

describe('LanguageService', () => {
  let apiClient: Client;
  let languageService: LanguageService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    languageService = new LanguageService(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('listSupportedLanguages', () => {
    test('returns array of Language objects', async () => {
      const mockLanguages = [
        { data: { id: 'fr', name: 'French', twoLettersCode: 'fr' } },
        { data: { id: 'de', name: 'German', twoLettersCode: 'de' } },
      ];
      const listSpy = mock().mockResolvedValue({ data: mockLanguages });
      spyOn(apiClient.languagesApi, 'withFetchAll').mockReturnValue({
        listSupportedLanguages: listSpy,
      } as never);

      const result = await languageService.listSupportedLanguages();

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('fr');
      expect(result[1]!.name).toBe('German');
    });

    test('calls withFetchAll().listSupportedLanguages', async () => {
      const listSpy = mock().mockResolvedValue({ data: [] });
      const withFetchAllSpy = spyOn(apiClient.languagesApi, 'withFetchAll').mockReturnValue({
        listSupportedLanguages: listSpy,
      } as never);

      await languageService.listSupportedLanguages();

      expect(withFetchAllSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.languagesApi, 'withFetchAll').mockReturnValue({
        listSupportedLanguages: mock().mockRejectedValue(new Error('network error')),
      } as never);

      expect(languageService.listSupportedLanguages()).rejects.toThrow(CliError);
    });
  });
});
