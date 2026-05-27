import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { TaskStatus } from '@/cli/services/TaskService.ts';
import type { GetApiClient, GetOutput, GetTaskService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import branch from '../upload/options/branch.ts';
import assigneeId from './options/assigneeId.ts';
import description from './options/description.ts';
import file from './options/file.ts';
import includePreTranslatedStringsOnly from './options/includePreTranslatedStringsOnly.ts';
import label from './options/label.ts';
import language from './options/language.ts';
import skipAssignedStrings from './options/skipAssignedStrings.ts';
import status from './options/status.ts';
import type_ from './options/type.ts';
import workflowStep from './options/workflowStep.ts';

const TASK_STATUSES = new Set<TaskStatus>(['todo', 'in_progress', 'done', 'closed']);
const TASK_TYPES = new Set(['translate', 'proofread']);

interface ListOptions extends GlobalOptions {
  status?: string;
  assigneeId?: string;
}

interface AddOptions extends GlobalOptions {
  type?: string;
  language?: string;
  file?: string | string[];
  branch?: string;
  workflowStep?: string;
  description?: string;
  skipAssignedStrings?: boolean;
  includePreTranslatedStringsOnly?: boolean;
  label?: string | string[];
}

export default class TaskCommand {
  constructor(
    private getOutput: GetOutput,
    private getTaskService: GetTaskService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'task',
      description: 'Manage tasks',
      subcommands: [
        {
          name: 'list',
          description: 'List tasks',
          options: [status, assigneeId],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new task',
          arguments: [
            {
              name: 'title',
              description: 'Task title',
            },
          ],
          options: [
            type_,
            language,
            file,
            branch,
            workflowStep,
            description,
            skipAssignedStrings,
            includePreTranslatedStringsOnly,
            label,
          ],
          action: this.addAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ListOptions;
    const output = this.getOutput(command);
    const taskService = await this.getTaskService(command);
    const status = options.status?.toLowerCase();
    const assigneeId = this.parseAssigneeId(options.assigneeId);

    if (status && !TASK_STATUSES.has(status as TaskStatus)) {
      throw new CliError(`Unsupported status: '${options.status}'`);
    }

    let tasks = await taskService.list(status as TaskStatus | undefined);

    if (assigneeId !== undefined) {
      tasks = tasks.filter((task) => task.assignees?.some((assignee) => assignee.id === assigneeId));
    }

    if (tasks.length === 0) {
      output.success('No tasks found');
      return;
    }

    if (options.verbose) {
      output.table(
        tasks.map((task) => ({
          id: task.id,
          languageId: task.targetLanguageId ?? '',
          title: task.title,
          status: task.status ?? '',
          words: task.wordsCount ?? '',
          deadline: task.deadline ? String(task.deadline) : 'NoDueDate',
        })),
      );
      return;
    }

    output.table(
      tasks.map((task) => ({
        id: task.id,
        languageId: task.targetLanguageId ?? '',
        title: task.title,
      })),
    );
  };

  addAction = async (command: Command) => {
    const options = command.optsWithGlobals() as AddOptions;
    const [title] = command.args;
    const output = this.getOutput(command);
    const taskService = await this.getTaskService(command);
    const apiClient = await this.getApiClient(command);
    const isEnterprise = Boolean(apiClient.organization);
    const type = options.type?.toLowerCase();
    const language = options.language;
    const files = this.toArray(options.file);
    const workflowStepId = this.parseNumber(options.workflowStep, "The '--workflow-step' value must be numeric");
    const labelIds = this.parseNumberArray(options.label, "The '--label' value must be numeric");

    if (!title) {
      throw new CliError('Task title can not be empty');
    }

    if (!language) {
      throw new CliError('Language can not be empty. (e.g. es-ES, en-US)');
    }

    if (files.length === 0) {
      throw new CliError("The '--file' value can not be empty");
    }

    if (isEnterprise) {
      if (workflowStepId === undefined) {
        throw new CliError('Workflow step id can not be empty');
      }
    } else {
      if (!type) {
        throw new CliError('Task type can not be empty. Possible values: translate, proofread');
      }

      if (!TASK_TYPES.has(type)) {
        throw new CliError('Unsupported task type. Possible values: translate, proofread');
      }
    }

    if (type === 'translate' && options.includePreTranslatedStringsOnly) {
      throw new CliError(
        "The '--include-pre-translated-strings-only' option can't be used with the 'translate' task type",
      );
    }

    const resolvedFiles = await taskService.resolveFileIds(files, options.branch);

    for (const missingPath of resolvedFiles.missingPaths) {
      output.warning(`Project doesn't contain the '${missingPath}' file`);
    }

    if (resolvedFiles.fileIds.length === 0) {
      throw new CliError('No valid file specified for the task. At least one valid file is required');
    }

    const request: Record<string, unknown> = {
      title,
      languageId: language,
      fileIds: resolvedFiles.fileIds,
      ...(options.description ? { description: options.description } : {}),
      ...(options.skipAssignedStrings !== undefined ? { skipAssignedStrings: options.skipAssignedStrings } : {}),
      ...(options.includePreTranslatedStringsOnly !== undefined
        ? { includePreTranslatedStringsOnly: options.includePreTranslatedStringsOnly }
        : {}),
      ...(labelIds.length > 0 ? { labelIds } : {}),
    };

    if (isEnterprise) {
      if (workflowStepId !== undefined) {
        request.workflowStepId = workflowStepId;
      }
    } else {
      request.type = type === 'translate' ? 0 : 1;
    }

    const task = await taskService.add(request);

    output.table([
      {
        id: task.id,
        languageId: task.targetLanguageId ?? language,
        title: task.title,
      },
    ]);
  };

  private parseAssigneeId(value?: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const assigneeId = Number(value);

    if (Number.isNaN(assigneeId)) {
      throw new CliError("The '--assignee-id' value must be numeric");
    }

    return assigneeId;
  }

  private parseNumber(value: string | undefined, message: string): number | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      throw new CliError(message);
    }

    return parsed;
  }

  private parseNumberArray(value: string | string[] | undefined, message: string): number[] {
    const values = this.toArray(value);
    const parsed = values.map((entry) => Number(entry));

    if (parsed.some((entry) => Number.isNaN(entry))) {
      throw new CliError(message);
    }

    return parsed;
  }

  private toArray(value: string | string[] | undefined): string[] {
    if (value === undefined || value === '') {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }
}
