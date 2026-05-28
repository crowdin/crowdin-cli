import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { DirectoryService } from '@/cli/services/DirectoryService.ts';

const PROJECT_ID = 123;

describe('DirectoryService', () => {
  let apiClient: Client;
  let directoryService: DirectoryService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    directoryService = new DirectoryService(apiClient, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('loadProjectDirectories', () => {
    test('returns directory list from API', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockResolvedValue({
        data: [{ data: { id: 1, path: '/docs' } }, { data: { id: 2, path: '/docs/sub' } }],
      } as never);

      const result = await directoryService.loadProjectDirectories();

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { branchId: undefined, recursion: '1' });
      expect(result).toHaveLength(2);
    });

    test('passes branchId when provided', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockResolvedValue({
        data: [],
      } as never);

      await directoryService.loadProjectDirectories(7);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { branchId: 7, recursion: '1' });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockRejectedValue(new Error('fail'));

      expect(directoryService.loadProjectDirectories()).rejects.toThrow(CliError);
    });
  });

  describe('createProjectDirectory', () => {
    test('calls API with name, directoryId, branchId', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'createDirectory').mockResolvedValue({
        data: { id: 10, name: 'docs' },
      } as never);

      await directoryService.createProjectDirectory('docs', 5, 3);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { name: 'docs', directoryId: 5, branchId: 3 });
    });

    test('works without optional args', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'createDirectory').mockResolvedValue({
        data: { id: 10, name: 'docs' },
      } as never);

      await directoryService.createProjectDirectory('docs');

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { name: 'docs', directoryId: undefined, branchId: undefined });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'createDirectory').mockRejectedValue(new Error('conflict'));

      expect(directoryService.createProjectDirectory('docs')).rejects.toThrow(CliError);
    });
  });

  describe('deleteProjectDirectory', () => {
    test('calls API with projectId and directoryId', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'deleteDirectory').mockResolvedValue(undefined as never);

      await directoryService.deleteProjectDirectory(55, '/docs');

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 55);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'deleteDirectory').mockRejectedValue(new Error('not found'));

      expect(directoryService.deleteProjectDirectory(99, '/gone')).rejects.toThrow(CliError);
    });
  });

  describe('resolveDirectoryId', () => {
    test('returns undefined when path not provided', async () => {
      const result = await directoryService.resolveDirectoryId(undefined);
      expect(result).toBeUndefined();
    });

    test('returns directory id when path matches', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockResolvedValue({
        data: [{ data: { id: 20, path: '/docs' } }, { data: { id: 21, path: '/src' } }],
      } as never);

      const result = await directoryService.resolveDirectoryId('docs');

      expect(result).toBe(20);
    });

    test('handles leading slash in search path', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockResolvedValue({
        data: [{ data: { id: 20, path: '/docs' } }],
      } as never);

      const result = await directoryService.resolveDirectoryId('/docs');

      expect(result).toBe(20);
    });

    test('throws CliError when directory not found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectDirectories').mockResolvedValue({
        data: [],
      } as never);

      expect(directoryService.resolveDirectoryId('missing')).rejects.toThrow(
        new CliError("Project doesn't contain the 'missing' directory"),
      );
    });
  });
});
