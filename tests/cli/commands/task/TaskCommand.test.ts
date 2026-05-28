import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { Client, TasksModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import TaskCommand from '@/cli/commands/task/TaskCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { TaskService } from '@/cli/services/TaskService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('TaskCommand', () => {
  let output: Output;
  let taskService: {
    list: ReturnType<typeof mock<TaskService['list']>>;
    add: ReturnType<typeof mock<TaskService['add']>>;
  };
  let projectService: {
    branch: {
      resolveBranchId: ReturnType<typeof mock<ProjectService['branch']['resolveBranchId']>>;
    };
    file: {
      resolveFileIds: ReturnType<typeof mock<ProjectService['file']['resolveFileIds']>>;
    };
  };
  let apiClient: { organization?: Client['organization'] };
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  const createCommandContext = (options: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createTaskCommand = () => {
    return new TaskCommand(
      () => output,
      async () => taskService as unknown as TaskService,
      async () => projectService as unknown as ProjectService,
      async () => apiClient as Client,
    );
  };

  const createTask = (overrides: Partial<TasksModel.Task>): TasksModel.Task =>
    ({ id: 1, title: 'Task title', targetLanguageId: 'uk', ...overrides }) as TasksModel.Task;

  beforeEach(() => {
    output = createOutput(globalOptions);
    taskService = {
      list: mock(async () => []),
      add: mock(async () => createTask({})),
    };
    projectService = {
      branch: {
        resolveBranchId: mock(async () => undefined),
      },
      file: {
        resolveFileIds: mock(async () => ({ fileIds: [], missingPaths: [] })),
      },
    };
    apiClient = {};

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createTaskCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  describe('listAction', () => {
    test('throws on unsupported status', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, status: 'unknown' });

      expect(cmd.listAction(commandContext)).rejects.toThrow(new CliError("Unsupported status: 'unknown'"));
    });

    test('throws when assignee id is not numeric', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, assigneeId: 'abc' });

      expect(cmd.listAction(commandContext)).rejects.toThrow(new CliError("The '--assignee-id' value must be numeric"));
    });

    test('lists task rows in non-verbose mode', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, status: 'todo' });
      taskService.list.mockResolvedValue([createTask({ id: 11, title: 'First task', targetLanguageId: 'fr' })]);

      await cmd.listAction(commandContext);

      expect(taskService.list).toHaveBeenCalledWith('todo');
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 11,
              languageId: 'fr',
              title: 'First task',
            },
          ],
          null,
          2,
        ),
      );
    });

    test('filters by assignee id', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, assigneeId: '101' });
      taskService.list.mockResolvedValue([
        createTask({
          id: 1,
          title: 'Keep',
          targetLanguageId: undefined,
          assignees: [{ id: 101 } as TasksModel.Assignee],
        }),
        createTask({
          id: 2,
          title: 'Drop',
          targetLanguageId: undefined,
          assignees: [{ id: 202 } as TasksModel.Assignee],
        }),
      ]);

      await cmd.listAction(commandContext);

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 1,
              languageId: '',
              title: 'Keep',
            },
          ],
          null,
          2,
        ),
      );
    });

    test('prints empty message when no tasks are found', async () => {
      const textOutput = createOutput({ ...globalOptions, format: 'text' });
      const cmd = new TaskCommand(
        () => textOutput,
        async () => taskService as unknown as TaskService,
        async () => projectService as unknown as ProjectService,
        async () => apiClient as Client,
      );
      const commandContext = createCommandContext({ ...globalOptions, format: 'text' });
      const successSpy = spyOn(textOutput, 'success');
      taskService.list.mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(successSpy).toHaveBeenCalledWith('No tasks found');
    });
  });

  describe('addAction', () => {
    test('validates required title', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, language: 'fr', file: ['a'] }, []);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError('Task title can not be empty'));
    });

    test('validates required language', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, file: ['a'] }, ['Title']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError('Language can not be empty. (e.g. es-ES, en-US)'),
      );
    });

    test('validates required file', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, language: 'fr' }, ['Title']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError("The '--file' value can not be empty"));
    });

    test('requires task type for non-enterprise', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext({ ...globalOptions, language: 'fr', file: ['content.md'] }, [
        'Title',
      ]);

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError('Task type can not be empty. Possible values: translate, proofread'),
      );
    });

    test('requires workflow step for enterprise', async () => {
      const cmd = createTaskCommand();
      apiClient.organization = 'acme';
      const commandContext = createCommandContext({ ...globalOptions, language: 'fr', file: ['content.md'] }, [
        'Title',
      ]);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError('Workflow step id can not be empty'));
    });

    test('rejects incompatible translate/pre-translated-only option pair', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          language: 'fr',
          file: ['content.md'],
          type: 'translate',
          includePreTranslatedStringsOnly: true,
        },
        ['Title'],
      );

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError("The '--include-pre-translated-strings-only' option can't be used with the 'translate' task type"),
      );
    });

    test('warns about missing files and fails when no valid files found', async () => {
      const textOutput = createOutput({ ...globalOptions, format: 'text' });
      const cmd = new TaskCommand(
        () => textOutput,
        async () => taskService as unknown as TaskService,
        async () => projectService as unknown as ProjectService,
        async () => apiClient as Client,
      );
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          format: 'text',
          language: 'fr',
          file: ['missing.yml'],
          type: 'proofread',
        },
        ['Title'],
      );
      const warningSpy = spyOn(textOutput, 'warning');
      projectService.file.resolveFileIds.mockResolvedValue({ fileIds: [], missingPaths: ['missing.yml'] });

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError('No valid file specified for the task. At least one valid file is required'),
      );
      expect(warningSpy).toHaveBeenCalledWith("Project doesn't contain the 'missing.yml' file");
    });

    test('creates non-enterprise task', async () => {
      const cmd = createTaskCommand();
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          type: 'translate',
          language: 'de',
          file: ['content.md'],
          label: ['11', '12'],
          description: 'new task',
        },
        ['Translate docs'],
      );
      projectService.file.resolveFileIds.mockResolvedValue({ fileIds: [55], missingPaths: [] });
      taskService.add.mockResolvedValue(createTask({ id: 99, title: 'Translate docs', targetLanguageId: 'de' }));

      await cmd.addAction(commandContext);

      expect(taskService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Translate docs',
          type: 0,
          languageId: 'de',
          fileIds: [55],
          labelIds: [11, 12],
          description: 'new task',
        }),
      );
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ id: 99, languageId: 'de', title: 'Translate docs' }], null, 2),
      );
    });

    test('creates enterprise task', async () => {
      const cmd = createTaskCommand();
      apiClient.organization = 'acme';
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          language: 'it',
          file: ['content.md'],
          workflowStep: '7',
          skipAssignedStrings: true,
        },
        ['Enterprise task'],
      );
      projectService.file.resolveFileIds.mockResolvedValue({ fileIds: [77], missingPaths: [] });
      taskService.add.mockResolvedValue(createTask({ id: 101, title: 'Enterprise task', targetLanguageId: 'it' }));

      await cmd.addAction(commandContext);

      expect(taskService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Enterprise task',
          languageId: 'it',
          workflowStepId: 7,
          fileIds: [77],
          skipAssignedStrings: true,
        }),
      );
    });
  });
});
