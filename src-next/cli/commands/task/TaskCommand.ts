import type { TasksModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { branch, projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { TaskStatus } from '@/cli/services/TaskService.ts';
import type { GetApiClient, GetBranchService, GetFileService, GetOutput, GetTaskService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { toArray, toNumberArray } from '@/cli/utils/parsing.ts';
import {
  assigneeId,
  description,
  file,
  includePreTranslatedStringsOnly,
  label,
  language,
  skipAssignedStrings,
  status,
  type as type_,
  workflowStep,
} from './options.ts';

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
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'task',
      description: 'Manage tasks',
      subcommands: [
        {
          name: 'list',
          description: 'List tasks',
          options: [status, assigneeId, projectConfigGroup],
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
            projectConfigGroup,
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
    const taskStatus = options.status?.toLowerCase() as TaskStatus | undefined;

    if (taskStatus && !TASK_STATUSES.has(taskStatus)) {
      throw new CliError(`Unsupported status: '${options.status}'`);
    }

    const [assigneeFilter] = toNumberArray(options.assigneeId, "The '--assignee-id' value must be numeric");
    const output = this.getOutput(command);
    const taskService = await this.getTaskService(command);
    let tasks = await taskService.list(taskStatus);

    if (assigneeFilter !== undefined) {
      tasks = tasks.filter((task) => task.assignees?.some((assignee) => assignee.id === assigneeFilter));
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
    const [title] = command.args;
    const options = command.optsWithGlobals() as AddOptions;
    const files = toArray(options.file);
    const type = options.type?.toLowerCase();
    const [workflowStepId] = toNumberArray(options.workflowStep, "The '--workflow-step' value must be numeric");
    const labelIds = toNumberArray(options.label, "The '--label' value must be numeric");

    if (!title) {
      throw new CliError('Task title can not be empty');
    }

    if (!options.language) {
      throw new CliError('Language can not be empty. (e.g. es-ES, en-US)');
    }

    if (files.length === 0) {
      throw new CliError("The '--file' value can not be empty");
    }

    const apiClient = await this.getApiClient(command);
    const isEnterprise = Boolean(apiClient.organization);

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

    const output = this.getOutput(command);
    const taskService = await this.getTaskService(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const branchId = await branchService.resolveBranchId(options.branch);
    const resolved = await fileService.resolveFileIds(files, branchId);

    for (const missing of resolved.missingPaths) {
      output.warning(`Project doesn't contain the '${missing}' file`);
    }

    if (resolved.fileIds.length === 0) {
      throw new CliError('No valid file specified for the task. At least one valid file is required');
    }

    const baseRequest = {
      title,
      languageId: options.language,
      fileIds: resolved.fileIds,
      ...(options.description ? { description: options.description } : {}),
      ...(options.skipAssignedStrings !== undefined ? { skipAssignedStrings: options.skipAssignedStrings } : {}),
      ...(options.includePreTranslatedStringsOnly !== undefined
        ? { includePreTranslatedStringsOnly: options.includePreTranslatedStringsOnly }
        : {}),
      ...(labelIds.length > 0 ? { labelIds } : {}),
    };

    const request = isEnterprise
      ? { ...baseRequest, workflowStepId }
      : { ...baseRequest, type: type === 'translate' ? 0 : 1 };
    const task = await taskService.add(request as TasksModel.CreateTaskRequest);

    output.table([
      {
        id: task.id,
        languageId: task.targetLanguageId ?? options.language,
        title: task.title,
      },
    ]);
  };
}
