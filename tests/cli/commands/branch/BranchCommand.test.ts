import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { ProjectsGroupsModel, type SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import BranchCommand from '@/cli/commands/branch/BranchCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('BranchCommand', () => {
  let output: Output;
  let branchService: {
    list: ReturnType<typeof mock<BranchService['list']>>;
    add: ReturnType<typeof mock<BranchService['add']>>;
    delete: ReturnType<typeof mock<BranchService['delete']>>;
    edit: ReturnType<typeof mock<BranchService['edit']>>;
    startClone: ReturnType<typeof mock<BranchService['startClone']>>;
    checkCloneStatus: ReturnType<typeof mock<BranchService['checkCloneStatus']>>;
    getClonedBranch: ReturnType<typeof mock<BranchService['getClonedBranch']>>;
    startMerge: ReturnType<typeof mock<BranchService['startMerge']>>;
    checkMergeStatus: ReturnType<typeof mock<BranchService['checkMergeStatus']>>;
    getMergeSummary: ReturnType<typeof mock<BranchService['getMergeSummary']>>;
  };
  let projectService: {
    loadProject: ReturnType<typeof mock<ProjectService['loadProject']>>;
  };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (
    options: Partial<GlobalOptions> & Record<string, unknown> = {},
    args: string[] = [],
  ) => {
    return {
      optsWithGlobals: () => ({ ...globalOptions, ...options }),
      args,
    } as unknown as Command;
  };

  const createBranch = (overrides: Partial<SourceFilesModel.Branch> = {}): SourceFilesModel.Branch =>
    ({ id: 14, name: 'main', title: '', ...overrides }) as SourceFilesModel.Branch;

  const createStatus = (overrides: Partial<{ identifier: string; status: string; progress: number }> = {}) =>
    ({ identifier: 'status-id', status: 'finished', progress: 100, ...overrides }) as never;

  const stringsBasedProject = {
    data: { type: ProjectsGroupsModel.Type.STRINGS_BASED },
  } as Awaited<ReturnType<ProjectService['loadProject']>>;
  const filesBasedProject = {
    data: { type: ProjectsGroupsModel.Type.FILES_BASED },
  } as Awaited<ReturnType<ProjectService['loadProject']>>;

  const createBranchCommand = () => {
    return new BranchCommand(
      () => output,
      async () => projectService as unknown as ProjectService,
      async () => branchService as unknown as BranchService,
    );
  };

  beforeEach(() => {
    output = createOutput(globalOptions);
    branchService = {
      list: mock(async () => [] as SourceFilesModel.Branch[]),
      add: mock(async () => createBranch()),
      delete: mock(async () => {}),
      edit: mock(async () => createBranch()),
      startClone: mock(async () => createStatus()),
      checkCloneStatus: mock(async () => createStatus()),
      getClonedBranch: mock(async () => createBranch()),
      startMerge: mock(async () => createStatus()),
      checkMergeStatus: mock(async () => createStatus()),
      getMergeSummary: mock(
        async () =>
          ({
            status: 'merged',
            sourceBranchId: 14,
            targetBranchId: 15,
            dryRun: false,
            details: { added: 1, deleted: 2, updated: 3, conflicted: 0 },
          }) as SourceFilesModel.MergeBranchSummary,
      ),
    };
    projectService = {
      loadProject: mock(async () => stringsBasedProject),
    };

    spyOn(Bun, 'sleep').mockResolvedValue(undefined);
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const branchCommand = createBranchCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await branchCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('defines all subcommands without command-local output options', () => {
    const branchCommand = createBranchCommand();
    const definition = branchCommand.getDefinition();
    const subcommandNames = definition.subcommands?.map((subcommand) => subcommand.name);

    expect(definition.name).toBe('branch');
    expect(subcommandNames).toEqual(['list', 'add', 'delete', 'edit', 'clone', 'merge']);

    for (const subcommand of definition.subcommands ?? []) {
      const optionNames = (subcommand.options ?? []).filter((option) => 'name' in option).map((option) => option.name);

      expect(optionNames).not.toContain('plain');
    }
  });

  describe('list', () => {
    test('lists branches with name first for plain format parity', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([
        createBranch({ id: 10, name: 'main' }),
        createBranch({ id: 11, name: 'release' }),
      ]);

      await branchCommand.listAction(createCommandContext());

      expect(branchService.list).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            { name: 'main', id: 10 },
            { name: 'release', id: 11 },
          ],
          null,
          2,
        ),
      );
    });

    test('strips leading slashes from branch names', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 10, name: '/main' })]);

      await branchCommand.listAction(createCommandContext());

      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ name: 'main', id: 10 }], null, 2));
    });

    test('prints empty message when no branches found', async () => {
      const branchCommand = createBranchCommand();
      output = createOutput({ ...globalOptions, output: 'text' });

      await branchCommand.listAction(createCommandContext());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No branches found'));
    });

    test('propagates list errors', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockRejectedValue(new CliError('Failed to list branches'));

      expect(branchCommand.listAction(createCommandContext())).rejects.toThrow(new CliError('Failed to list branches'));
    });
  });

  describe('add', () => {
    test('requires branch name', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.addAction(createCommandContext())).rejects.toThrow(new CliError('Branch name is required'));
      expect(branchService.add).not.toHaveBeenCalled();
    });

    test('adds a new branch', async () => {
      const branchCommand = createBranchCommand();
      branchService.add.mockResolvedValue(createBranch({ id: 20, name: 'dev' }));

      await branchCommand.addAction(createCommandContext({}, ['dev']));

      expect(branchService.add).toHaveBeenCalledWith({ name: 'dev' });
      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ name: 'dev', id: 20 }], null, 2));
    });

    test('passes title, export pattern and priority', async () => {
      const branchCommand = createBranchCommand();

      await branchCommand.addAction(
        createCommandContext({ title: 'Dev branch', exportPattern: '%locale%', priority: 'high' }, ['dev']),
      );

      expect(branchService.add).toHaveBeenCalledWith({
        name: 'dev',
        title: 'Dev branch',
        exportPattern: '%locale%',
        priority: 'high',
      });
    });

    test('normalizes branch name and keeps original as title', async () => {
      const branchCommand = createBranchCommand();

      await branchCommand.addAction(createCommandContext({}, ['feature/x']));

      expect(branchService.add).toHaveBeenCalledWith({ name: 'feature.x', title: 'feature/x' });
    });

    test('skips adding branch that already exists', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      output = createOutput({ ...globalOptions, output: 'text' });

      await branchCommand.addAction(createCommandContext({}, ['main']));

      expect(branchService.add).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Branch 'main' already exists in the project"));
    });

    test('propagates add errors', async () => {
      const branchCommand = createBranchCommand();
      branchService.add.mockRejectedValue(new CliError("Failed to add branch 'dev'"));

      expect(branchCommand.addAction(createCommandContext({}, ['dev']))).rejects.toThrow(
        new CliError("Failed to add branch 'dev'"),
      );
    });
  });

  describe('delete', () => {
    test('requires branch name', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.deleteAction(createCommandContext())).rejects.toThrow(
        new CliError('Branch name is required'),
      );
      expect(branchService.delete).not.toHaveBeenCalled();
    });

    test('deletes branch by name', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      output = createOutput({ ...globalOptions, output: 'text' });

      await branchCommand.deleteAction(createCommandContext({}, ['main']));

      expect(branchService.delete).toHaveBeenCalledWith(14);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Branch 'main' deleted"));
    });

    test('finds branch by normalized name', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 21, name: 'feature.x' })]);

      await branchCommand.deleteAction(createCommandContext({}, ['feature/x']));

      expect(branchService.delete).toHaveBeenCalledWith(21);
    });

    test('skips deleting missing branch', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([]);
      output = createOutput({ ...globalOptions, output: 'text' });

      await branchCommand.deleteAction(createCommandContext({}, ['main']));

      expect(branchService.delete).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Branch 'main' doesn't exist in the project"));
    });

    test('propagates delete errors', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.delete.mockRejectedValue(new CliError('Failed to delete branch'));

      expect(branchCommand.deleteAction(createCommandContext({}, ['main']))).rejects.toThrow(
        new CliError('Failed to delete branch'),
      );
    });
  });

  describe('edit', () => {
    test('requires branch name', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.editAction(createCommandContext({ title: 'New title' }))).rejects.toThrow(
        new CliError('Branch name is required'),
      );
    });

    test('requires at least one parameter to edit', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.editAction(createCommandContext({}, ['main']))).rejects.toThrow(
        new CliError('Specify some parameters to edit the branch'),
      );
      expect(branchService.edit).not.toHaveBeenCalled();
    });

    test('throws when branch does not exist', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([]);

      expect(branchCommand.editAction(createCommandContext({ title: 'New title' }, ['main']))).rejects.toThrow(
        new CliError("Project doesn't contain the 'main' branch"),
      );
      expect(branchService.edit).not.toHaveBeenCalled();
    });

    const editCases: Array<[Record<string, unknown>, Array<Record<string, unknown>>]> = [
      [{ name: 'dev' }, [{ op: 'replace', path: '/name', value: 'dev' }]],
      [{ title: 'test' }, [{ op: 'replace', path: '/title', value: 'test' }]],
      [{ priority: 'high' }, [{ op: 'replace', path: '/priority', value: 'high' }]],
      [
        { name: 'dev', title: 'test', priority: 'high' },
        [
          { op: 'replace', path: '/name', value: 'dev' },
          { op: 'replace', path: '/title', value: 'test' },
          { op: 'replace', path: '/priority', value: 'high' },
        ],
      ],
    ];

    test.each(editCases)('builds patch requests for %j', async (options, patches) => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.edit.mockResolvedValue(createBranch({ id: 14, name: 'dev' }));

      await branchCommand.editAction(createCommandContext(options, ['main']));

      expect(branchService.edit).toHaveBeenCalledWith(14, patches);
      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ name: 'dev', id: 14 }], null, 2));
    });

    test('normalizes the new branch name', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);

      await branchCommand.editAction(createCommandContext({ name: 'feature/x' }, ['main']));

      expect(branchService.edit).toHaveBeenCalledWith(14, [{ op: 'replace', path: '/name', value: 'feature.x' }]);
    });

    test('propagates edit errors', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.edit.mockRejectedValue(new CliError('Failed to edit branch'));

      expect(branchCommand.editAction(createCommandContext({ title: 'New title' }, ['main']))).rejects.toThrow(
        new CliError('Failed to edit branch'),
      );
    });
  });

  describe('clone', () => {
    test('requires source and target branch names', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.cloneAction(createCommandContext({}, ['main']))).rejects.toThrow(
        new CliError('Source and target branch names are required'),
      );
      expect(branchService.startClone).not.toHaveBeenCalled();
    });

    test('is only available for string-based projects', async () => {
      const branchCommand = createBranchCommand();
      projectService.loadProject.mockResolvedValue(filesBasedProject);

      expect(branchCommand.cloneAction(createCommandContext({}, ['main', 'clone']))).rejects.toThrow(
        new CliError('This command is only available for string-based projects'),
      );
      expect(branchService.startClone).not.toHaveBeenCalled();
    });

    test('throws when source branch does not exist', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([]);

      expect(branchCommand.cloneAction(createCommandContext({}, ['main', 'clone']))).rejects.toThrow(
        new CliError("Project doesn't contain the 'main' branch"),
      );
    });

    test('clones branch and polls until finished', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.startClone.mockResolvedValue(
        createStatus({ identifier: 'clone-id', status: 'created', progress: 0 }),
      );
      branchService.checkCloneStatus.mockResolvedValue(createStatus({ identifier: 'clone-id' }));
      branchService.getClonedBranch.mockResolvedValue(createBranch({ id: 20, name: 'cloned' }));

      await branchCommand.cloneAction(createCommandContext({}, ['main', 'cloned']));

      expect(branchService.startClone).toHaveBeenCalledWith(14, { name: 'cloned' });
      expect(branchService.checkCloneStatus).toHaveBeenCalledWith(14, 'clone-id');
      expect(branchService.getClonedBranch).toHaveBeenCalledWith(14, 'clone-id');
      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ name: 'cloned', id: 20 }], null, 2));
    });

    test('normalizes target name and keeps original as title', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);

      await branchCommand.cloneAction(createCommandContext({}, ['main', 'feature/x']));

      expect(branchService.startClone).toHaveBeenCalledWith(14, { name: 'feature.x', title: 'feature/x' });
    });

    test('throws when clone fails', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.startClone.mockResolvedValue(createStatus({ status: 'failed', progress: 0 }));

      expect(branchCommand.cloneAction(createCommandContext({}, ['main', 'cloned']))).rejects.toThrow(
        new CliError('Failed to clone the branch'),
      );
      expect(branchService.getClonedBranch).not.toHaveBeenCalled();
    });

    test('propagates already exists error from the service', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'main' })]);
      branchService.startClone.mockRejectedValue(new CliError("Branch 'cloned' already exists in the project"));

      expect(branchCommand.cloneAction(createCommandContext({}, ['main', 'cloned']))).rejects.toThrow(
        new CliError("Branch 'cloned' already exists in the project"),
      );
    });
  });

  describe('merge', () => {
    test('requires source and target branch names', async () => {
      const branchCommand = createBranchCommand();

      expect(branchCommand.mergeAction(createCommandContext({}, ['main']))).rejects.toThrow(
        new CliError('Source and target branch names are required'),
      );
      expect(branchService.startMerge).not.toHaveBeenCalled();
    });

    test('is only available for string-based projects', async () => {
      const branchCommand = createBranchCommand();
      projectService.loadProject.mockResolvedValue(filesBasedProject);

      expect(branchCommand.mergeAction(createCommandContext({}, ['dev', 'main']))).rejects.toThrow(
        new CliError('This command is only available for string-based projects'),
      );
      expect(branchService.startMerge).not.toHaveBeenCalled();
    });

    test('throws when source branch does not exist', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 15, name: 'main' })]);

      expect(branchCommand.mergeAction(createCommandContext({}, ['dev', 'main']))).rejects.toThrow(
        new CliError("Project doesn't contain the 'dev' branch"),
      );
    });

    test('throws when target branch does not exist', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([createBranch({ id: 14, name: 'dev' })]);

      expect(branchCommand.mergeAction(createCommandContext({}, ['dev', 'main']))).rejects.toThrow(
        new CliError("Project doesn't contain the 'main' branch"),
      );
    });

    test('merges branches and prints summary in text format', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([
        createBranch({ id: 14, name: 'dev' }),
        createBranch({ id: 15, name: 'main' }),
      ]);
      branchService.startMerge.mockResolvedValue(
        createStatus({ identifier: 'merge-id', status: 'created', progress: 0 }),
      );
      branchService.checkMergeStatus.mockResolvedValue(createStatus({ identifier: 'merge-id' }));
      output = createOutput({ ...globalOptions, output: 'text' });

      await branchCommand.mergeAction(createCommandContext({ output: 'text' }, ['dev', 'main']));

      expect(branchService.startMerge).toHaveBeenCalledWith(15, {
        sourceBranchId: 14,
        deleteAfterMerge: false,
        dryRun: false,
      });
      expect(branchService.checkMergeStatus).toHaveBeenCalledWith(15, 'merge-id');
      expect(branchService.getMergeSummary).toHaveBeenCalledWith(15, 'merge-id');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Merged branch 'dev' into 'main'"));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Merge summary: added: 1, deleted: 2, updated: 3, conflicted: 0'),
      );
    });

    test('passes dryrun and delete-after-merge options', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([
        createBranch({ id: 14, name: 'dev' }),
        createBranch({ id: 15, name: 'main' }),
      ]);

      await branchCommand.mergeAction(createCommandContext({ dryrun: true, deleteAfterMerge: true }, ['dev', 'main']));

      expect(branchService.startMerge).toHaveBeenCalledWith(15, {
        sourceBranchId: 14,
        deleteAfterMerge: true,
        dryRun: true,
      });
    });

    test('prints merge summary with target branch id first in structured formats', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([
        createBranch({ id: 14, name: 'dev' }),
        createBranch({ id: 15, name: 'main' }),
      ]);

      await branchCommand.mergeAction(createCommandContext({}, ['dev', 'main']));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ targetBranchId: 15, added: 1, deleted: 2, updated: 3, conflicted: 0 }], null, 2),
      );
    });

    test('throws when merge fails', async () => {
      const branchCommand = createBranchCommand();
      branchService.list.mockResolvedValue([
        createBranch({ id: 14, name: 'dev' }),
        createBranch({ id: 15, name: 'main' }),
      ]);
      branchService.startMerge.mockResolvedValue(createStatus({ status: 'failed', progress: 0 }));

      expect(branchCommand.mergeAction(createCommandContext({}, ['dev', 'main']))).rejects.toThrow(
        new CliError('Failed to merge the branch'),
      );
      expect(branchService.getMergeSummary).not.toHaveBeenCalled();
    });
  });
});
