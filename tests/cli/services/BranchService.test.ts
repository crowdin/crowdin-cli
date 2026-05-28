import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { BranchService } from '@/cli/services/BranchService.ts';

const PROJECT_ID = 123;

describe('BranchService', () => {
  let apiClient: Client;
  let branchService: BranchService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    branchService = new BranchService(apiClient, PROJECT_ID);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('getBranch', () => {
    test('returns undefined when name is undefined', async () => {
      const result = await branchService.getBranch(undefined);
      expect(result).toBeUndefined();
    });

    test('returns undefined when name is "none"', async () => {
      const result = await branchService.getBranch('none');
      expect(result).toBeUndefined();
    });

    test('returns branch data when found by name', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 10, name: 'main' } }, { data: { id: 11, name: 'release' } }],
      } as never);

      const result = await branchService.getBranch('release');

      expect(result).toEqual({ id: 11, name: 'release' });
    });

    test('returns undefined when name not found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 10, name: 'main' } }],
      } as never);

      const result = await branchService.getBranch('missing');

      expect(result).toBeUndefined();
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockRejectedValue(new Error('Network error'));

      expect(branchService.getBranch('main')).rejects.toThrow(CliError);
    });
  });

  describe('getOrCreateBranch', () => {
    test('returns undefined when name is undefined', async () => {
      const result = await branchService.getOrCreateBranch(undefined);
      expect(result).toBeUndefined();
    });

    test('returns undefined when name is "none"', async () => {
      const result = await branchService.getOrCreateBranch('none');
      expect(result).toBeUndefined();
    });

    test('returns existing branch when found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 5, name: 'feat/x' } }],
      } as never);
      const createBranch = spyOn(apiClient.sourceFilesApi, 'createBranch');

      const result = await branchService.getOrCreateBranch('feat/x');

      expect(result).toEqual({ id: 5, name: 'feat/x' });
      expect(createBranch).not.toHaveBeenCalled();
    });

    test('creates branch when not found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({ data: [] } as never);
      spyOn(apiClient.sourceFilesApi, 'createBranch').mockResolvedValue({
        data: { id: 99, name: 'new-branch' },
      } as never);

      const result = await branchService.getOrCreateBranch('new-branch');

      expect(result).toEqual({ id: 99, name: 'new-branch' });
    });
  });

  describe('resolveBranchId', () => {
    test('returns undefined when name is undefined', async () => {
      const result = await branchService.resolveBranchId(undefined);
      expect(result).toBeUndefined();
    });

    test('returns undefined when name is "none"', async () => {
      const result = await branchService.resolveBranchId('none');
      expect(result).toBeUndefined();
    });

    test('returns branch id when branch found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 7, name: 'release' } }],
      } as never);

      const result = await branchService.resolveBranchId('release');

      expect(result).toBe(7);
    });

    test('throws CliError when branch not found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({ data: [] } as never);

      expect(branchService.resolveBranchId('missing')).rejects.toThrow(
        new CliError("Project doesn't contain the 'missing' branch"),
      );
    });

    test('creates branch when createMissing=true and branch absent', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({ data: [] } as never);
      spyOn(apiClient.sourceFilesApi, 'createBranch').mockResolvedValue({
        data: { id: 42, name: 'auto-branch' },
      } as never);

      const result = await branchService.resolveBranchId('auto-branch', true);

      expect(result).toBe(42);
    });
  });

  describe('listProjectBranches', () => {
    test('returns branches from API', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 1, name: 'main' } }],
      } as never);

      const result = await branchService.listProjectBranches();

      expect(spy).toHaveBeenCalledWith(PROJECT_ID);
      expect(result.data).toHaveLength(1);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockRejectedValue(new Error('timeout'));

      expect(branchService.listProjectBranches()).rejects.toThrow(CliError);
    });
  });
});
