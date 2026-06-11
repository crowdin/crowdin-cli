import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { TmService } from '@/cli/services/TmService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  format: 'json',
};

describe('TmService', () => {
  let apiClient: Client;
  let output: Output;
  let tmService: TmService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    tmService = new TmService(apiClient, output);

    spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  describe('list', () => {
    test('returns unwrapped translation memories', async () => {
      const listTm = mock(async () => ({
        data: [{ data: { id: 42, name: '42', segmentsCount: 10 } }],
      }));
      spyOn(apiClient.translationMemoryApi, 'withFetchAll').mockReturnValue({ listTm } as never);

      const tms = await tmService.list();

      expect(tms).toEqual([{ id: 42, name: '42', segmentsCount: 10 }] as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'withFetchAll').mockReturnValue({
        listTm: mock(async () => {
          throw new Error('forbidden');
        }),
      } as never);

      expect(tmService.list()).rejects.toThrow(new CliError('Failed to list translation memories. forbidden'));
    });
  });

  describe('get', () => {
    test('returns translation memory by id', async () => {
      spyOn(apiClient.translationMemoryApi, 'getTm').mockResolvedValue({ data: { id: 42, name: '42' } } as never);

      const tm = await tmService.get(42);

      expect(tm).toEqual({ id: 42, name: '42' } as never);
      expect(apiClient.translationMemoryApi.getTm).toHaveBeenCalledWith(42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'getTm').mockRejectedValue(new Error('not found'));

      expect(tmService.get(45)).rejects.toThrow(new CliError('Failed to get translation memory #45. not found'));
    });
  });

  describe('add', () => {
    test('creates translation memory', async () => {
      spyOn(apiClient.translationMemoryApi, 'addTm').mockResolvedValue({ data: { id: 43, name: 'new tm' } } as never);

      const tm = await tmService.add({ name: 'new tm', languageId: 'uk' });

      expect(tm).toEqual({ id: 43, name: 'new tm' } as never);
      expect(apiClient.translationMemoryApi.addTm).toHaveBeenCalledWith({ name: 'new tm', languageId: 'uk' });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'addTm').mockRejectedValue(new Error('invalid'));

      expect(tmService.add({ name: 'new tm', languageId: 'uk' })).rejects.toThrow(
        new CliError("Failed to add translation memory 'new tm'. invalid"),
      );
    });
  });

  describe('export', () => {
    test('returns export id when the export finishes immediately', async () => {
      spyOn(apiClient.translationMemoryApi, 'exportTm').mockResolvedValue({
        data: { identifier: 'export-id', status: 'finished' },
      } as never);

      const exportId = await tmService.export(42);

      expect(exportId).toBe('export-id');
      expect(apiClient.translationMemoryApi.exportTm).toHaveBeenCalledWith(42, {});
    });

    test('passes language pair and format to the export request', async () => {
      spyOn(apiClient.translationMemoryApi, 'exportTm').mockResolvedValue({
        data: { identifier: 'export-id', status: 'finished' },
      } as never);

      await tmService.export(42, 'en', 'uk', 'csv');

      expect(apiClient.translationMemoryApi.exportTm).toHaveBeenCalledWith(42, {
        sourceLanguageId: 'en',
        targetLanguageId: 'uk',
        format: 'csv',
      });
    });

    test('polls export status until finished', async () => {
      spyOn(apiClient.translationMemoryApi, 'exportTm').mockResolvedValue({
        data: { identifier: 'export-id', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.translationMemoryApi, 'checkExportStatus')
        .mockResolvedValueOnce({ data: { identifier: 'export-id', status: 'inProgress', progress: 50 } } as never)
        .mockResolvedValueOnce({ data: { identifier: 'export-id', status: 'finished' } } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      const exportId = await tmService.export(42);

      expect(exportId).toBe('export-id');
      expect(apiClient.translationMemoryApi.checkExportStatus).toHaveBeenCalledTimes(2);
      expect(apiClient.translationMemoryApi.checkExportStatus).toHaveBeenCalledWith(42, 'export-id');
    });

    test('throws CliError when the export fails', async () => {
      spyOn(apiClient.translationMemoryApi, 'exportTm').mockResolvedValue({
        data: { identifier: 'export-id', status: 'failed' },
      } as never);

      expect(tmService.export(42)).rejects.toThrow(new CliError('The build has failed'));
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'exportTm').mockRejectedValue(new Error('boom'));

      expect(tmService.export(42)).rejects.toThrow(new CliError('Failed to build the translation memory. boom'));
    });
  });

  describe('getDownloadUrl', () => {
    test('returns download url', async () => {
      spyOn(apiClient.translationMemoryApi, 'downloadTm').mockResolvedValue({
        data: { url: 'https://example.test/tm.tmx' },
      } as never);

      const url = await tmService.getDownloadUrl(42, 'export-id');

      expect(url).toBe('https://example.test/tm.tmx');
      expect(apiClient.translationMemoryApi.downloadTm).toHaveBeenCalledWith(42, 'export-id');
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'downloadTm').mockRejectedValue(new Error('expired'));

      expect(tmService.getDownloadUrl(42, 'export-id')).rejects.toThrow(
        new CliError('Failed to download translation memory. expired'),
      );
    });
  });

  describe('import', () => {
    test('starts the import', async () => {
      spyOn(apiClient.translationMemoryApi, 'importTm').mockResolvedValue({} as never);

      await tmService.import(42, { storageId: 52, scheme: { en: 0, uk: 1 }, firstLineContainsHeader: true });

      expect(apiClient.translationMemoryApi.importTm).toHaveBeenCalledWith(42, {
        storageId: 52,
        scheme: { en: 0, uk: 1 },
        firstLineContainsHeader: true,
      });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationMemoryApi, 'importTm').mockRejectedValue(new Error('invalid storage'));

      expect(tmService.import(42, { storageId: 52 })).rejects.toThrow(
        new CliError('Failed to import translation memory. invalid storage'),
      );
    });
  });
});
