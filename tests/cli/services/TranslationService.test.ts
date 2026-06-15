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
  output: 'json',
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

      expect(result).toBe(build as never);
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

  describe('getTranslationDownloadUrl', () => {
    test('returns download URL for build', async () => {
      spyOn(apiClient.translationsApi, 'downloadTranslations').mockResolvedValue({
        data: { url: 'https://example.test/translations.zip' },
      } as never);

      const url = await translationService.getTranslationDownloadUrl(99);

      expect(url).toBe('https://example.test/translations.zip');
    });

    test('calls API with projectId and buildId', async () => {
      const spy = spyOn(apiClient.translationsApi, 'downloadTranslations').mockResolvedValue({
        data: { url: 'https://example.test/translations.zip' },
      } as never);

      await translationService.getTranslationDownloadUrl(42);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationsApi, 'downloadTranslations').mockRejectedValue(new Error('gone'));

      expect(translationService.getTranslationDownloadUrl(99)).rejects.toThrow(CliError);
    });
  });

  describe('getMtSupportedLanguageIds', () => {
    test('returns the supported language ids of the engine', async () => {
      const spy = spyOn(apiClient.machineTranslationApi, 'getMt').mockResolvedValue({
        data: { supportedLanguageIds: ['ua', 'fr'] },
      } as never);

      const languageIds = await translationService.getMtSupportedLanguageIds(7);

      expect(spy).toHaveBeenCalledWith(7);
      expect(languageIds).toEqual(['ua', 'fr']);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.machineTranslationApi, 'getMt').mockRejectedValue(new Error('not found'));

      expect(translationService.getMtSupportedLanguageIds(7)).rejects.toThrow(CliError);
    });
  });

  describe('preTranslate', () => {
    test('polls until finished and returns the final status', async () => {
      const apply = spyOn(apiClient.translationsApi, 'applyPreTranslation').mockResolvedValue({
        data: { identifier: '121', status: 'created', progress: 0 },
      } as never);
      const check = spyOn(apiClient.translationsApi, 'preTranslationStatus')
        .mockResolvedValueOnce({ data: { identifier: '121', status: 'inProgress', progress: 50 } } as never)
        .mockResolvedValueOnce({ data: { identifier: '121', status: 'finished', progress: 100 } } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      const request = { languageIds: ['ua'], fileIds: [101] };
      const status = await translationService.preTranslate(request, false);

      expect(apply).toHaveBeenCalledWith(PROJECT_ID, request);
      expect(check).toHaveBeenCalledWith(PROJECT_ID, '121');
      expect(status.status).toBe('finished');
    });

    test('throws CliError when pre-translation fails', async () => {
      spyOn(apiClient.translationsApi, 'applyPreTranslation').mockResolvedValue({
        data: { identifier: '121', status: 'inProgress', progress: 10 },
      } as never);
      spyOn(apiClient.translationsApi, 'preTranslationStatus').mockResolvedValue({
        data: { identifier: '121', status: 'failed', progress: 10 },
      } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      expect(translationService.preTranslate({ languageIds: ['ua'], fileIds: [101] }, false)).rejects.toThrow(CliError);
    });
  });

  describe('getPreTranslationReport', () => {
    test('returns the report data', async () => {
      const report = { preTranslateType: 'tm', languages: [] };
      const spy = spyOn(apiClient.translationsApi, 'getPreTranslationReport').mockResolvedValue({
        data: report,
      } as never);

      const result = await translationService.getPreTranslationReport('121');

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, '121');
      expect(result).toBe(report as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationsApi, 'getPreTranslationReport').mockRejectedValue(new Error('boom'));

      expect(translationService.getPreTranslationReport('121')).rejects.toThrow(CliError);
    });
  });
});
