import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

const PROJECT_ID = 123;

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

const mockFiles = [{ data: { id: 1, path: '/docs/readme.md' } }, { data: { id: 2, path: '/src/index.ts' } }];

describe('FileService', () => {
  let apiClient: Client;
  let output: Output;
  let fileService: FileService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    fileService = new FileService(apiClient, output, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('loadProjectFiles', () => {
    test('returns file list from API', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: mockFiles,
      } as never);

      const result = await fileService.loadProjectFiles();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].data.path).toBe('/docs/readme.md');
    });

    test('passes branchId when provided', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [],
      } as never);

      await fileService.loadProjectFiles(5);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { branchId: 5 });
    });

    test('throws CliError when API fails', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockRejectedValue(new Error('fail'));

      expect(fileService.loadProjectFiles()).rejects.toThrow(CliError);
    });
  });

  describe('resolveFileIds', () => {
    beforeEach(() => {
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: mockFiles,
      } as never);
    });

    test('returns matched file ids', async () => {
      const result = await fileService.resolveFileIds(['docs/readme.md', 'src/index.ts']);

      expect(result.fileIds).toEqual([1, 2]);
      expect(result.missingPaths).toEqual([]);
    });

    test('reports unmatched paths as missingPaths', async () => {
      const result = await fileService.resolveFileIds(['docs/readme.md', 'nonexistent.ts']);

      expect(result.fileIds).toEqual([1]);
      expect(result.missingPaths).toEqual(['nonexistent.ts']);
    });

    test('deduplicates file ids', async () => {
      const result = await fileService.resolveFileIds(['docs/readme.md', 'docs/readme.md']);

      expect(result.fileIds).toEqual([1]);
    });

    test('returns all missing when no files match', async () => {
      const result = await fileService.resolveFileIds(['gone.md']);

      expect(result.fileIds).toEqual([]);
      expect(result.missingPaths).toEqual(['gone.md']);
    });
  });

  describe('listProjectFilePaths', () => {
    test('returns map of id to normalized path', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: mockFiles,
      } as never);

      const result = await fileService.listProjectFilePaths();

      expect(result.get(1)).toBe('/docs/readme.md');
      expect(result.get(2)).toBe('/src/index.ts');
    });
  });

  describe('updateProjectFile', () => {
    test('calls updateOrRestoreFile with correct args', async () => {
      const updateSpy = spyOn(apiClient.sourceFilesApi, 'updateOrRestoreFile').mockResolvedValue({} as never);

      await fileService.updateProjectFile(10, 99, 'local.md', '%file_name%.md', [1, 2]);

      expect(updateSpy).toHaveBeenCalledWith(PROJECT_ID, 10, {
        storageId: 99,
        exportOptions: { exportPattern: '%file_name%.md' },
        attachLabelIds: [1, 2],
      });
    });

    test('calls editFile to set excludedTargetLanguages when provided', async () => {
      spyOn(apiClient.sourceFilesApi, 'updateOrRestoreFile').mockResolvedValue({} as never);
      const editSpy = spyOn(apiClient.sourceFilesApi, 'editFile').mockResolvedValue({} as never);

      await fileService.updateProjectFile(10, 99, 'local.md', undefined, undefined, ['fr', 'de']);

      expect(editSpy).toHaveBeenCalledWith(PROJECT_ID, 10, [
        { op: 'replace', path: '/excludedTargetLanguages', value: ['fr', 'de'] },
      ]);
    });

    test('skips editFile when excludedTargetLanguages is undefined', async () => {
      spyOn(apiClient.sourceFilesApi, 'updateOrRestoreFile').mockResolvedValue({} as never);
      const editSpy = spyOn(apiClient.sourceFilesApi, 'editFile').mockResolvedValue({} as never);

      await fileService.updateProjectFile(10, 99, 'local.md');

      expect(editSpy).not.toHaveBeenCalled();
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'updateOrRestoreFile').mockRejectedValue(new Error('conflict'));

      expect(fileService.updateProjectFile(10, 99, 'local.md')).rejects.toThrow(CliError);
    });
  });

  describe('deleteProjectFile', () => {
    test('calls API with projectId and fileId', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'deleteFile').mockResolvedValue(undefined as never);

      await fileService.deleteProjectFile(55, '/docs/readme.md');

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 55);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'deleteFile').mockRejectedValue(new Error('not found'));

      expect(fileService.deleteProjectFile(99, '/gone.md')).rejects.toThrow(CliError);
    });
  });

  describe('createProjectFile', () => {
    test('calls createFile with projectId and request data', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'createFile').mockResolvedValue({
        data: { id: 10, name: 'app.json' },
      } as never);

      await fileService.createProjectFile({
        storageId: 99,
        name: 'app.json',
        directoryId: 5,
        branchId: 3,
        exportOptions: { exportPattern: '/locale/%locale%/%original_file_name%' },
      });

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, {
        storageId: 99,
        name: 'app.json',
        directoryId: 5,
        branchId: 3,
        exportOptions: { exportPattern: '/locale/%locale%/%original_file_name%' },
      });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'createFile').mockRejectedValue(new Error('conflict'));

      expect(fileService.createProjectFile({ storageId: 1, name: 'app.json' })).rejects.toThrow(CliError);
    });
  });

  describe('getSourceFileDownloadUrl', () => {
    test('returns download URL for file', async () => {
      spyOn(apiClient.sourceFilesApi, 'downloadFile').mockResolvedValue({
        data: { url: 'https://example.test/app.json' },
      } as never);

      const url = await fileService.getSourceFileDownloadUrl(10);

      expect(url).toBe('https://example.test/app.json');
    });

    test('calls API with projectId and fileId', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'downloadFile').mockResolvedValue({
        data: { url: 'https://example.test/app.json' },
      } as never);

      await fileService.getSourceFileDownloadUrl(42);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 42);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'downloadFile').mockRejectedValue(new Error('forbidden'));

      expect(fileService.getSourceFileDownloadUrl(99)).rejects.toThrow(CliError);
    });
  });

  describe('buildReviewedSources', () => {
    test('polls until finished and returns build', async () => {
      const build = { data: { id: 55, status: 'inProgress' } };
      spyOn(apiClient.sourceFilesApi, 'buildReviewedSourceFiles').mockResolvedValue(build as never);
      spyOn(apiClient.sourceFilesApi, 'checkReviewedSourceFilesBuildStatus')
        .mockResolvedValueOnce({ data: { status: 'inProgress' } } as never)
        .mockResolvedValueOnce({ data: { status: 'finished' } } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      const result = await fileService.buildReviewedSources();

      expect(result).toBe(build);
    });

    test('passes branchId to API', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'buildReviewedSourceFiles').mockResolvedValue({
        data: { id: 55 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'checkReviewedSourceFilesBuildStatus').mockResolvedValue({
        data: { status: 'finished' },
      } as never);

      await fileService.buildReviewedSources(7);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { branchId: 7 });
    });

    test('throws CliError when build status is "failed"', async () => {
      spyOn(apiClient.sourceFilesApi, 'buildReviewedSourceFiles').mockResolvedValue({
        data: { id: 55 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'checkReviewedSourceFilesBuildStatus').mockResolvedValue({
        data: { status: 'failed' },
      } as never);
      spyOn(Bun, 'sleep').mockResolvedValue(undefined);

      expect(fileService.buildReviewedSources()).rejects.toThrow(new CliError('Reviewed sources build failed'));
    });

    test('wraps API error from buildReviewedSourceFiles as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'buildReviewedSourceFiles').mockRejectedValue(new Error('server error'));

      expect(fileService.buildReviewedSources()).rejects.toThrow(CliError);
    });
  });

  describe('getReviewedSourcesDownloadUrl', () => {
    test('returns download URL for reviewed sources build', async () => {
      spyOn(apiClient.sourceFilesApi, 'downloadReviewedSourceFiles').mockResolvedValue({
        data: { url: 'https://example.test/reviewed.zip' },
      } as never);

      const url = await fileService.getReviewedSourcesDownloadUrl(55);

      expect(url).toBe('https://example.test/reviewed.zip');
    });

    test('calls API with projectId and buildId', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'downloadReviewedSourceFiles').mockResolvedValue({
        data: { url: 'https://example.test/reviewed.zip' },
      } as never);

      await fileService.getReviewedSourcesDownloadUrl(77);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 77);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'downloadReviewedSourceFiles').mockRejectedValue(new Error('gone'));

      expect(fileService.getReviewedSourcesDownloadUrl(55)).rejects.toThrow(CliError);
    });
  });
});
