import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { GlossaryService } from '@/cli/services/GlossaryService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

describe('GlossaryService', () => {
  let apiClient: Client;
  let output: Output;
  let glossaryService: GlossaryService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    glossaryService = new GlossaryService(apiClient, output);

    spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  describe('list', () => {
    test('returns unwrapped glossaries', async () => {
      const listGlossaries = mock(async () => ({
        data: [{ data: { id: 42, name: 'forty-two', terms: 2 } }],
      }));
      spyOn(apiClient.glossariesApi, 'withFetchAll').mockReturnValue({ listGlossaries } as never);

      const glossaries = await glossaryService.list();

      expect(glossaries).toEqual([{ id: 42, name: 'forty-two', terms: 2 }] as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'withFetchAll').mockReturnValue({
        listGlossaries: mock(async () => {
          throw new Error('forbidden');
        }),
      } as never);

      expect(glossaryService.list()).rejects.toThrow(new CliError('Failed to list glossaries. forbidden'));
    });
  });

  describe('get', () => {
    test('returns glossary by id', async () => {
      spyOn(apiClient.glossariesApi, 'getGlossary').mockResolvedValue({
        data: { id: 42, name: 'forty-two' },
      } as never);

      const glossary = await glossaryService.get(42);

      expect(glossary).toEqual({ id: 42, name: 'forty-two' } as never);
      expect(apiClient.glossariesApi.getGlossary).toHaveBeenCalledWith(42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'getGlossary').mockRejectedValue(new Error('not found'));

      expect(glossaryService.get(45)).rejects.toThrow(new CliError('Failed to get glossary #45. not found'));
    });
  });

  describe('add', () => {
    test('creates glossary', async () => {
      spyOn(apiClient.glossariesApi, 'addGlossary').mockResolvedValue({
        data: { id: 43, name: 'new glossary' },
      } as never);

      const glossary = await glossaryService.add({ name: 'new glossary', languageId: 'uk' });

      expect(glossary).toEqual({ id: 43, name: 'new glossary' } as never);
      expect(apiClient.glossariesApi.addGlossary).toHaveBeenCalledWith({ name: 'new glossary', languageId: 'uk' });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'addGlossary').mockRejectedValue(new Error('invalid'));

      expect(glossaryService.add({ name: 'new glossary', languageId: 'uk' })).rejects.toThrow(
        new CliError("Failed to add glossary 'new glossary'. invalid"),
      );
    });
  });

  describe('listTerms', () => {
    test('returns unwrapped terms', async () => {
      const listTerms = mock(async () => ({
        data: [{ data: { id: 52, text: 'fifty-two', description: 'How' } }],
      }));
      spyOn(apiClient.glossariesApi, 'withFetchAll').mockReturnValue({ listTerms } as never);

      const terms = await glossaryService.listTerms(42);

      expect(terms).toEqual([{ id: 52, text: 'fifty-two', description: 'How' }] as never);
      expect(listTerms).toHaveBeenCalledWith(42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'withFetchAll').mockReturnValue({
        listTerms: mock(async () => {
          throw new Error('forbidden');
        }),
      } as never);

      expect(glossaryService.listTerms(42)).rejects.toThrow(
        new CliError('Failed to list terms of glossary #42. forbidden'),
      );
    });
  });

  describe('export', () => {
    test('returns export id when the export finishes immediately', async () => {
      spyOn(apiClient.glossariesApi, 'exportGlossary').mockResolvedValue({
        data: { identifier: 'export-id', status: 'finished' },
      } as never);

      const exportId = await glossaryService.export(42);

      expect(exportId).toBe('export-id');
      expect(apiClient.glossariesApi.exportGlossary).toHaveBeenCalledWith(42, {});
    });

    test('passes format to the export request', async () => {
      spyOn(apiClient.glossariesApi, 'exportGlossary').mockResolvedValue({
        data: { identifier: 'export-id', status: 'finished' },
      } as never);

      await glossaryService.export(42, 'csv');

      expect(apiClient.glossariesApi.exportGlossary).toHaveBeenCalledWith(42, { format: 'csv' });
    });

    test('polls export status until finished', async () => {
      spyOn(apiClient.glossariesApi, 'exportGlossary').mockResolvedValue({
        data: { identifier: 'export-id', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.glossariesApi, 'checkGlossaryExportStatus')
        .mockResolvedValueOnce({ data: { identifier: 'export-id', status: 'inProgress', progress: 50 } } as never)
        .mockResolvedValueOnce({ data: { identifier: 'export-id', status: 'finished' } } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      const exportId = await glossaryService.export(42);

      expect(exportId).toBe('export-id');
      expect(apiClient.glossariesApi.checkGlossaryExportStatus).toHaveBeenCalledTimes(2);
      expect(apiClient.glossariesApi.checkGlossaryExportStatus).toHaveBeenCalledWith(42, 'export-id');
    });

    test('throws CliError when the export fails', async () => {
      spyOn(apiClient.glossariesApi, 'exportGlossary').mockResolvedValue({
        data: { identifier: 'export-id', status: 'failed' },
      } as never);

      expect(glossaryService.export(42)).rejects.toThrow(new CliError('The build has failed'));
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'exportGlossary').mockRejectedValue(new Error('boom'));

      expect(glossaryService.export(42)).rejects.toThrow(new CliError('Failed to build the glossary. boom'));
    });
  });

  describe('getDownloadUrl', () => {
    test('returns download url', async () => {
      spyOn(apiClient.glossariesApi, 'downloadGlossary').mockResolvedValue({
        data: { url: 'https://example.test/glossary.tbx' },
      } as never);

      const url = await glossaryService.getDownloadUrl(42, 'export-id');

      expect(url).toBe('https://example.test/glossary.tbx');
      expect(apiClient.glossariesApi.downloadGlossary).toHaveBeenCalledWith(42, 'export-id');
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'downloadGlossary').mockRejectedValue(new Error('expired'));

      expect(glossaryService.getDownloadUrl(42, 'export-id')).rejects.toThrow(
        new CliError('Failed to download glossary. expired'),
      );
    });
  });

  describe('import', () => {
    test('starts the import', async () => {
      spyOn(apiClient.glossariesApi, 'importGlossaryFile').mockResolvedValue({} as never);

      await glossaryService.import(42, { storageId: 52, scheme: { term_en: 0 }, firstLineContainsHeader: true });

      expect(apiClient.glossariesApi.importGlossaryFile).toHaveBeenCalledWith(42, {
        storageId: 52,
        scheme: { term_en: 0 },
        firstLineContainsHeader: true,
      });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.glossariesApi, 'importGlossaryFile').mockRejectedValue(new Error('invalid storage'));

      expect(glossaryService.import(42, { storageId: 52 })).rejects.toThrow(
        new CliError('Failed to import glossary. invalid storage'),
      );
    });
  });
});
