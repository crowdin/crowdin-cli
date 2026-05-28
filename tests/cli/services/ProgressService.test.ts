import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { ProgressService } from '@/cli/services/ProgressService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const PROJECT_ID = 123;

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  format: 'json',
};

describe('ProgressService', () => {
  let apiClient: Client;
  let output: Output;
  let progressService: ProgressService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    progressService = new ProgressService(apiClient, output, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('loadProjectProgress', () => {
    test('returns project progress from API', async () => {
      spyOn(apiClient.translationStatusApi, 'getProjectProgress').mockResolvedValue({
        data: [{ data: { languageId: 'fr', translationProgress: 80, approvalProgress: 70 } }],
      } as never);

      const result = await progressService.loadProjectProgress();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].data.languageId).toBe('fr');
    });

    test('throws CliError when API fails', async () => {
      spyOn(apiClient.translationStatusApi, 'getProjectProgress').mockRejectedValue(new Error('forbidden'));

      expect(progressService.loadProjectProgress()).rejects.toThrow(CliError);
    });
  });

  describe('loadBranchProgress', () => {
    test('calls API with projectId and branchId', async () => {
      const spy = spyOn(apiClient.translationStatusApi, 'getBranchProgress').mockResolvedValue({
        data: [],
      } as never);

      await progressService.loadBranchProgress(7);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 7);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationStatusApi, 'getBranchProgress').mockRejectedValue(new Error('fail'));

      expect(progressService.loadBranchProgress(7)).rejects.toThrow(CliError);
    });
  });

  describe('loadFileProgress', () => {
    test('calls API with projectId and fileId', async () => {
      const spy = spyOn(apiClient.translationStatusApi, 'getFileProgress').mockResolvedValue({
        data: [],
      } as never);

      await progressService.loadFileProgress(42);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationStatusApi, 'getFileProgress').mockRejectedValue(new Error('fail'));

      expect(progressService.loadFileProgress(42)).rejects.toThrow(CliError);
    });
  });

  describe('loadDirectoryProgress', () => {
    test('calls API with projectId and directoryId', async () => {
      const spy = spyOn(apiClient.translationStatusApi, 'getDirectoryProgress').mockResolvedValue({
        data: [],
      } as never);

      await progressService.loadDirectoryProgress(15);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 15);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.translationStatusApi, 'getDirectoryProgress').mockRejectedValue(new Error('fail'));

      expect(progressService.loadDirectoryProgress(15)).rejects.toThrow(CliError);
    });
  });
});
