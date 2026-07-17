import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client, CrowdinValidationError } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { BranchService } from '@/cli/services/BranchService.ts';

const PROJECT_ID = 123;

describe('BranchService', () => {
  let apiClient: Client;
  let branchService: BranchService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    branchService = new BranchService(apiClient, PROJECT_ID);
    spyOn(Bun, 'sleep').mockResolvedValue(undefined);
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

      expect(result).toEqual({ id: 11, name: 'release' } as never);
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

      expect(result).toEqual({ id: 5, name: 'feat/x' } as never);
      expect(createBranch).not.toHaveBeenCalled();
    });

    test('creates branch when not found', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({ data: [] } as never);
      spyOn(apiClient.sourceFilesApi, 'createBranch').mockResolvedValue({
        data: { id: 99, name: 'new-branch' },
      } as never);

      const result = await branchService.getOrCreateBranch('new-branch');

      expect(result).toEqual({ id: 99, name: 'new-branch' } as never);
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

  describe('list', () => {
    test('returns branches from API', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 1, name: 'main' } }],
      } as never);

      const result = await branchService.list();

      expect(spy).toHaveBeenCalledWith(PROJECT_ID);
      expect(result).toEqual([{ id: 1, name: 'main' }] as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockRejectedValue(new Error('timeout'));

      expect(branchService.list()).rejects.toThrow(CliError);
    });
  });

  describe('add', () => {
    test('creates branch and returns its data', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'createBranch').mockResolvedValue({
        data: { id: 20, name: 'dev' },
      } as never);

      const result = await branchService.add({ name: 'dev', title: 'Dev' });

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, { name: 'dev', title: 'Dev' });
      expect(result).toEqual({ id: 20, name: 'dev' } as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'createBranch').mockRejectedValue(new Error('boom'));

      expect(branchService.add({ name: 'dev' })).rejects.toThrow(new CliError("Failed to add branch 'dev'. boom"));
    });
  });

  describe('delete', () => {
    test('deletes branch by id', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'deleteBranch').mockResolvedValue(undefined as never);

      await branchService.delete(14);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 14);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'deleteBranch').mockRejectedValue(new Error('boom'));

      expect(branchService.delete(14)).rejects.toThrow(CliError);
    });
  });

  describe('edit', () => {
    test('patches branch and returns its data', async () => {
      const spy = spyOn(apiClient.sourceFilesApi, 'editBranch').mockResolvedValue({
        data: { id: 14, name: 'dev' },
      } as never);
      const patches = [{ op: 'replace' as const, path: '/name', value: 'dev' }];

      const result = await branchService.edit(14, patches);

      expect(spy).toHaveBeenCalledWith(PROJECT_ID, 14, patches);
      expect(result).toEqual({ id: 14, name: 'dev' } as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'editBranch').mockRejectedValue(new Error('boom'));

      expect(branchService.edit(14, [])).rejects.toThrow(CliError);
    });
  });

  describe('cloneBranch', () => {
    // The clone is async server-side; cloneBranch must wait for the status to finish before
    // returning the new branch, reporting each poll's progress along the way.
    test('starts, polls until finished, then returns the cloned branch', async () => {
      const start = spyOn(apiClient.sourceFilesApi, 'clonedBranch').mockResolvedValue({
        data: { identifier: 'clone-id', status: 'created', progress: 0 },
      } as never);
      const statuses = [
        { data: { identifier: 'clone-id', status: 'in_progress', progress: 50 } },
        { data: { identifier: 'clone-id', status: 'finished', progress: 100 } },
      ];
      const statusSpy = spyOn(apiClient.sourceFilesApi, 'checkBranchClonedStatus').mockImplementation(
        async () => statuses.shift() as never,
      );
      const getCloned = spyOn(apiClient.sourceFilesApi, 'getClonedBranch').mockResolvedValue({
        data: { id: 20, name: 'cloned' },
      } as never);
      const progress: number[] = [];

      const result = await branchService.cloneBranch(14, { name: 'cloned' }, (p) => progress.push(p));

      expect(start).toHaveBeenCalledWith(PROJECT_ID, 14, { name: 'cloned' });
      expect(statusSpy).toHaveBeenCalledWith(PROJECT_ID, 14, 'clone-id');
      expect(statusSpy).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([50, 100]);
      expect(getCloned).toHaveBeenCalledWith(PROJECT_ID, 14, 'clone-id');
      expect(result).toEqual({ id: 20, name: 'cloned' } as never);
    });

    test('throws when the clone status reports failure', async () => {
      spyOn(apiClient.sourceFilesApi, 'clonedBranch').mockResolvedValue({
        data: { identifier: 'clone-id', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'checkBranchClonedStatus').mockResolvedValue({
        data: { identifier: 'clone-id', status: 'failed', progress: 0 },
      } as never);
      const getCloned = spyOn(apiClient.sourceFilesApi, 'getClonedBranch');

      expect(branchService.cloneBranch(14, { name: 'cloned' })).rejects.toThrow(
        new CliError('Failed to clone the branch'),
      );
      expect(getCloned).not.toHaveBeenCalled();
    });

    test('reports an already existing branch', async () => {
      spyOn(apiClient.sourceFilesApi, 'clonedBranch').mockRejectedValue(
        new CrowdinValidationError('Name must be unique', [], {}),
      );

      expect(branchService.cloneBranch(14, { name: 'cloned' })).rejects.toThrow(
        new CliError("Branch 'cloned' already exists in the project"),
      );
    });

    test('uses title for the already exists message when set', async () => {
      spyOn(apiClient.sourceFilesApi, 'clonedBranch').mockRejectedValue(
        new CrowdinValidationError('Name must be unique', [], {}),
      );

      expect(branchService.cloneBranch(14, { name: 'feature.x', title: 'feature/x' })).rejects.toThrow(
        new CliError("Branch 'feature/x' already exists in the project"),
      );
    });

    test('wraps a start error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'clonedBranch').mockRejectedValue(new Error('boom'));

      expect(branchService.cloneBranch(14, { name: 'cloned' })).rejects.toThrow(
        new CliError('Failed to clone the branch. boom'),
      );
    });
  });

  describe('mergeBranch', () => {
    const summary = {
      status: 'merged',
      sourceBranchId: 14,
      targetBranchId: 15,
      dryRun: false,
      details: { added: 1, deleted: 2, updated: 3, conflicted: 0 },
    };

    test('starts, polls until finished, then returns the merge summary', async () => {
      const request = { sourceBranchId: 14, deleteAfterMerge: false, dryRun: false };
      const start = spyOn(apiClient.sourceFilesApi, 'mergeBranch').mockResolvedValue({
        data: { identifier: 'merge-id', status: 'created', progress: 0 },
      } as never);
      const statuses = [
        { data: { identifier: 'merge-id', status: 'in_progress', progress: 50 } },
        { data: { identifier: 'merge-id', status: 'finished', progress: 100 } },
      ];
      const statusSpy = spyOn(apiClient.sourceFilesApi, 'checkBranchMergeStatus').mockImplementation(
        async () => statuses.shift() as never,
      );
      const getSummary = spyOn(apiClient.sourceFilesApi, 'getBranchMergeSummary').mockResolvedValue({
        data: summary,
      } as never);

      const result = await branchService.mergeBranch(15, request);

      expect(start).toHaveBeenCalledWith(PROJECT_ID, 15, request);
      expect(statusSpy).toHaveBeenCalledWith(PROJECT_ID, 15, 'merge-id');
      expect(statusSpy).toHaveBeenCalledTimes(2);
      expect(getSummary).toHaveBeenCalledWith(PROJECT_ID, 15, 'merge-id');
      expect(result).toEqual(summary as never);
    });

    test('throws when the merge status reports failure', async () => {
      spyOn(apiClient.sourceFilesApi, 'mergeBranch').mockResolvedValue({
        data: { identifier: 'merge-id', status: 'created', progress: 0 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'checkBranchMergeStatus').mockResolvedValue({
        data: { identifier: 'merge-id', status: 'failed', progress: 0 },
      } as never);
      const getSummary = spyOn(apiClient.sourceFilesApi, 'getBranchMergeSummary');

      expect(branchService.mergeBranch(15, { sourceBranchId: 14 })).rejects.toThrow(
        new CliError('Failed to merge the branch'),
      );
      expect(getSummary).not.toHaveBeenCalled();
    });

    test('wraps a start error as CliError', async () => {
      spyOn(apiClient.sourceFilesApi, 'mergeBranch').mockRejectedValue(new Error('boom'));

      expect(branchService.mergeBranch(15, { sourceBranchId: 14 })).rejects.toThrow(
        new CliError('Failed to merge the branch. boom'),
      );
    });
  });
});
