import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const PROJECT_ID = 123;

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  format: 'json',
};

describe('TranslationService', () => {
  let apiClient: Client;
  let output: Output;
  let translationService: TranslationService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    translationService = new TranslationService(apiClient, output, PROJECT_ID);
    mock.module('bun', () => ({ sleep: mock(async () => {}) }));
  });

  afterEach(() => {
    mock.restore();
  });

  describe('importProjectTranslation', () => {
    test('calls API with all required args', async () => {
      const spy = spyOn(apiClient.translationsApi, 'importTranslations').mockResolvedValue({} as never);

      await translationService.importProjectTranslation(10, 5, ['fr', 'de'], '/docs/readme.md', true, false, true);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, {
        storageId: 10,
        fileId: 5,
        languageIds: ['fr', 'de'],
        autoApproveImported: true,
        importEqSuggestions: false,
        translateHidden: true,
      });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationsApi, 'importTranslations').mockRejectedValue(new Error('forbidden'));

      expect(translationService.importProjectTranslation(10, 5, ['fr'], '/docs/readme.md')).rejects.toThrow(CliError);
    });
  });

  describe('buildProjectTranslations', () => {
    test('polls until finished and returns build', async () => {
      const build = { data: { id: 77, status: 'created' } };
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue(build as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus')
        .mockResolvedValueOnce({ data: { status: 'inProgress' } } as never)
        .mockResolvedValueOnce({ data: { status: 'finished' } } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      const result = await translationService.buildProjectTranslations();

      expect(result).toBe(build);
    });

    test('throws CliError when build status is "failed"', async () => {
      spyOn(apiClient.translationsApi, 'buildProject').mockResolvedValue({
        data: { id: 77 },
      } as never);
      spyOn(apiClient.translationsApi, 'checkBuildStatus').mockResolvedValue({
        data: { status: 'failed' },
      } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      expect(translationService.buildProjectTranslations()).rejects.toThrow(new CliError('Translations build failed'));
    });

    test('wraps API error from buildProject as CliError', async () => {
      spyOn(apiClient.translationsApi, 'buildProject').mockRejectedValue(new Error('server error'));

      expect(translationService.buildProjectTranslations()).rejects.toThrow(CliError);
    });
  });
});
