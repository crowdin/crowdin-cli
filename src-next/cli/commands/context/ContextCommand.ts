import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetProjectService,
  GetStringService,
} from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import {
  fullContext,
  getAiContextSection,
  getManualContext,
  getStringText,
  readContextRecords,
  type StringContextRecord,
} from '@/cli/utils/aiContext.ts';
import type { Output } from '@/cli/utils/output.ts';
import { toArray } from '@/cli/utils/parsing.ts';
import { isPathMatch } from '@/cli/utils/pathMatcher.ts';

const BATCH_SIZE = 100;
const SINCE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const AVAILABLE_STATUSES = ['empty', 'ai', 'manual'];
const DEFAULT_CONTEXT_FILE = 'crowdin-context.jsonl';

// TODO: Java '--format' (file format) is intentionally not ported: 'jsonl' is the only supported value

const toOption: OptionDef = {
  name: 'to',
  type: 'string',
  default: DEFAULT_CONTEXT_FILE,
  description: `File path to download the context to. Default: ${DEFAULT_CONTEXT_FILE}`,
};

const fileFilterOption: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  variadic: true,
  description: 'Filter strings by Crowdin file paths (glob) (multiple paths can be specified)',
};

const labelFilterOption: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Filter strings by labels (multiple labels can be specified)',
};

const branchFilterOption: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  description: 'Filter by branch name',
};

const croqlOption: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'CroQL expression',
};

const sinceOption: OptionDef = {
  name: 'since',
  type: 'string',
  description: 'Only strings created after this date (YYYY-MM-DD)',
};

const statusOption: OptionDef = {
  name: 'status',
  type: 'string',
  description: 'Filter by context status. Supported values: empty, ai, manual',
};

const fromOption: OptionDef = {
  name: 'from',
  type: 'string',
  default: DEFAULT_CONTEXT_FILE,
  description: `The file path to upload the context from. Only files previously downloaded by the context download command are supported. Default: ${DEFAULT_CONTEXT_FILE}`,
};

const overwriteOption: OptionDef = {
  name: 'overwrite',
  type: 'boolean',
  description: 'Also update strings where ai_context is empty (removes their AI section). Default: false',
};

const dryrunOption: OptionDef = {
  name: 'dryrun',
  type: 'boolean',
  description: 'Preview changes without applying them',
};

const resetFileOption: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  variadic: true,
  description: 'Only reset strings from matching file paths (multiple paths can be specified)',
};

const resetLabelOption: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Only reset strings from matching labels (multiple labels can be specified)',
};

const resetBranchOption: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  description: 'Only reset strings from matching branch',
};

const resetCroqlOption: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'Only reset strings from matching CroQL expression',
};

const resetSinceOption: OptionDef = {
  name: 'since',
  type: 'string',
  description: 'Only reset strings that were created after this date (YYYY-MM-DD)',
};

const allOption: OptionDef = {
  name: 'all',
  type: 'boolean',
  description: 'Required safety flag when no filter is specified',
};

const byFileOption: OptionDef = {
  name: 'by-file',
  type: 'boolean',
  description: 'Break down stats per file',
};

interface FilterOptions extends GlobalOptions {
  file?: string | string[];
  label?: string | string[];
  branch?: string;
  croql?: string;
  since?: string;
}

interface DownloadOptions extends FilterOptions {
  to: string;
  status?: string;
}

interface UploadOptions extends GlobalOptions {
  from: string;
  overwrite?: boolean;
  dryrun?: boolean;
}

interface ResetOptions extends FilterOptions {
  dryrun?: boolean;
  all?: boolean;
}

interface StatusOptions extends FilterOptions {
  byFile?: boolean;
}

interface FilteredStrings {
  project: ProjectsGroupsModel.Project;
  isStringsBased: boolean;
  strings: SourceStringsModel.String[];
  filePaths: Map<number, string>;
}

interface ContextStats {
  total: number;
  withAi: number;
  withAiPercentage: string;
  withoutAi: number;
  withoutAiPercentage: string;
  withManual: number;
  withManualPercentage: string;
}

export default class ContextCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStringService: GetStringService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'context',
      description: 'Manage strings context',
      subcommands: [
        {
          name: 'download',
          description: 'Download strings context to a separate file for enrichment by AI Agent',
          options: [
            toOption,
            fileFilterOption,
            labelFilterOption,
            branchFilterOption,
            croqlOption,
            sinceOption,
            statusOption,
          ],
          action: this.downloadAction,
        },
        {
          name: 'upload',
          description: 'Upload strings context',
          options: [fromOption, overwriteOption, dryrunOption],
          action: this.uploadAction,
        },
        {
          name: 'reset',
          description: 'Remove AI-generated context from strings, preserving manual context',
          options: [
            resetFileOption,
            resetLabelOption,
            resetBranchOption,
            resetCroqlOption,
            resetSinceOption,
            dryrunOption,
            allOption,
          ],
          action: this.resetAction,
        },
        {
          name: 'status',
          description: 'Show context coverage statistics',
          options: [fileFilterOption, labelFilterOption, branchFilterOption, croqlOption, sinceOption, byFileOption],
          action: this.statusAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  downloadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as DownloadOptions;

    this.validateSince(options.since);

    if (options.status !== undefined && !AVAILABLE_STATUSES.includes(options.status)) {
      throw new CliError("The '--status' parameter has an invalid value. Supported values: empty, ai, manual");
    }

    const output = this.getOutput(command);
    const { isStringsBased, strings, filePaths } = await this.fetchFilteredStrings(command, options);
    const existingRecords = (await Bun.file(options.to).exists()) ? await readContextRecords(options.to) : [];
    const filtered = this.filterByStatus(strings, options.status);

    if (filtered.length === 0) {
      output.warning('No strings found');
      return;
    }

    output.success(`Downloaded ${filtered.length} strings`);

    const jsonl = filtered
      .map((entry) => {
        const record: StringContextRecord = {
          id: entry.id,
          key: entry.identifier ?? '',
          text: getStringText(entry.text),
          file: isStringsBased ? '' : (filePaths.get(entry.fileId) ?? ''),
          context: getManualContext(entry.context),
          ai_context:
            existingRecords.find((existing) => existing.id === entry.id)?.ai_context ??
            getAiContextSection(entry.context),
        };

        return JSON.stringify(record);
      })
      .join('\n');

    try {
      await Bun.write(options.to, jsonl);
    } catch (error) {
      throw toCliError(error, `Failed to write to the file '${options.to}'`);
    }

    output.success(`'${options.to}' saved successfully`);
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadOptions;

    if (!(await Bun.file(options.from).exists())) {
      // Same wording as the Java CLI (error.file_not_found)
      throw new CliError(`File '${options.from}' not found in the Crowdin project`);
    }

    const output = this.getOutput(command);
    let records = await readContextRecords(options.from);

    if (!options.overwrite) {
      records = records.filter((record) => record.ai_context !== '');
    }

    const recordsWithContext = records.map((record) => ({
      record,
      context: fullContext(record.context, record.ai_context),
    }));

    if (options.dryrun) {
      for (const { record, context } of recordsWithContext) {
        output.success(`String #${record.id}: ${record.text} (context: ${context}) would be uploaded`);
      }

      return;
    }

    const patch: PatchRequest[] = recordsWithContext.map(({ record, context }) => ({
      op: 'replace',
      path: `/${record.id}/context`,
      value: context,
    }));

    await this.applyBatches(command, output, patch);
  };

  resetAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ResetOptions;

    this.validateSince(options.since);

    const hasFilter =
      toArray(options.file).length > 0 ||
      toArray(options.label).length > 0 ||
      Boolean(options.branch) ||
      Boolean(options.croql) ||
      options.since !== undefined;

    if (!hasFilter && !options.all) {
      throw new CliError("The '--all' parameter should be specified explicitly if no other filter was provided");
    }

    const output = this.getOutput(command);
    const { strings } = await this.fetchFilteredStrings(command, options);
    const withAiContext = strings.filter((entry) => getAiContextSection(entry.context) !== '');

    if (withAiContext.length === 0) {
      output.warning('No strings found');
      return;
    }

    output.success(`Downloaded ${withAiContext.length} strings`);

    if (options.dryrun) {
      for (const entry of withAiContext) {
        output.success(
          `String #${entry.id}: ${getStringText(entry.text)} (context: ${getManualContext(entry.context)}) would be updated`,
        );
      }

      return;
    }

    const patch: PatchRequest[] = withAiContext.map((entry) => ({
      op: 'replace',
      path: `/${entry.id}/context`,
      value: getManualContext(entry.context),
    }));

    await this.applyBatches(command, output, patch);
  };

  statusAction = async (command: Command) => {
    const options = command.optsWithGlobals() as StatusOptions;

    this.validateSince(options.since);

    const output = this.getOutput(command);
    const { project, isStringsBased, strings, filePaths } = await this.fetchFilteredStrings(command, options);

    output.log(`Context Status for Project "${project.name}" (ID: ${project.id})`);
    output.log('');

    if (options.byFile && !isStringsBased) {
      const groupedByFile = new Map<string, SourceStringsModel.String[]>();

      for (const entry of strings) {
        const path = filePaths.get(entry.fileId) ?? '';
        const group = groupedByFile.get(path) ?? [];

        group.push(entry);
        groupedByFile.set(path, group);
      }

      output.table(
        [...groupedByFile.entries()].map(([file, group]) => {
          const stats = this.calculateStats(group);

          return {
            file,
            total: stats.total,
            aiContext: `${stats.withAi} (${stats.withAiPercentage}%)`,
            missing: stats.total - stats.withAi,
          };
        }),
      );
    } else {
      const stats = this.calculateStats(strings);

      output.table([
        {
          totalStrings: stats.total,
          withAiContext: `${stats.withAi} (${stats.withAiPercentage}%)`,
          withoutAiContext: `${stats.withoutAi} (${stats.withoutAiPercentage}%)`,
          withManualContext: `${stats.withManual} (${stats.withManualPercentage}%)`,
        },
      ]);
    }

    output.log('');
    output.log("Run 'crowdin context download --status=empty' to export strings needing context.");
  };

  private async fetchFilteredStrings(command: Command, options: FilterOptions): Promise<FilteredStrings> {
    const projectService = await this.getProjectService(command);
    const stringService = await this.getStringService(command);
    const branchService = await this.getBranchService(command);
    const labelService = await this.getLabelService(command);
    const fileService = await this.getFileService(command);

    const project = (await projectService.loadProject()).data;
    const isStringsBased = project.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const branchId = await branchService.resolveBranchId(options.branch);
    const labelIds = await labelService.resolveLabelIds(toArray(options.label), false);
    const filePaths = isStringsBased ? new Map<number, string>() : await fileService.listProjectFilePaths(branchId);
    const fileFilters = toArray(options.file);

    const baseParams: SourceStringsModel.ListProjectStringsOptions = {
      ...(branchId !== undefined ? { branchId } : {}),
      ...(labelIds?.length ? { labelIds: labelIds.join(',') } : {}),
      ...(options.croql ? { croql: options.croql } : {}),
    };

    let strings: SourceStringsModel.String[];

    if (!isStringsBased && fileFilters.length > 0) {
      // A file filter that matches nothing yields no strings. The Java CLI
      // falls back to all project strings for 'status' and 'reset' in that
      // case — an intentional divergence: silently widening the scope of a
      // destructive 'reset' to the whole project is unsafe.
      const fileIds = [...filePaths.entries()]
        .filter(([, path]) => fileFilters.some((filter) => isPathMatch(path, filter)))
        .map(([id]) => id);

      strings = [];

      for (const fileId of fileIds) {
        strings.push(...(await stringService.list({ ...baseParams, fileId })));
      }
    } else {
      strings = await stringService.list(baseParams);
    }

    if (options.since !== undefined) {
      const since = options.since;
      strings = strings.filter((entry) => this.isCreatedSince(entry.createdAt, since));
    }

    return { project, isStringsBased, strings, filePaths };
  }

  private async applyBatches(command: Command, output: Output, patch: PatchRequest[]): Promise<void> {
    const stringService = await this.getStringService(command);

    for (let start = 0; start < patch.length; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, patch.length);

      await stringService.batchEdit(patch.slice(start, end));
      output.success(`Updated strings ${end}/${patch.length}`);
    }
  }

  private filterByStatus(strings: SourceStringsModel.String[], status?: string): SourceStringsModel.String[] {
    switch (status) {
      case 'empty':
        return strings.filter((entry) => !entry.context);
      case 'ai':
        return strings.filter((entry) => getAiContextSection(entry.context) !== '');
      case 'manual':
        return strings.filter((entry) => getManualContext(entry.context) !== '');
      default:
        return strings;
    }
  }

  private validateSince(since?: string): void {
    if (since === undefined) {
      return;
    }

    if (!SINCE_FORMAT.test(since) || !this.isValidDate(since)) {
      throw new CliError("The '--since' parameter should be in 'YYYY-MM-DD' format");
    }
  }

  private isValidDate(since: string): boolean {
    const [year, month, day] = since.split('-').map(Number) as [number, number, number];
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  private isCreatedSince(createdAt: string | undefined, since: string): boolean {
    if (!createdAt) {
      return false;
    }

    const created = new Date(createdAt);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    const [year, month, day] = since.split('-').map(Number) as [number, number, number];

    return createdDay.getTime() >= new Date(year, month - 1, day).getTime();
  }

  private calculateStats(strings: SourceStringsModel.String[]): ContextStats {
    const total = strings.length;
    const withAi = strings.filter((entry) => getAiContextSection(entry.context) !== '').length;
    const withManual = strings.filter((entry) => getManualContext(entry.context) !== '').length;
    const withoutAi = total - withAi;
    const percentage = (value: number) => ((value / total) * 100).toFixed(2);

    return {
      total,
      withAi,
      withAiPercentage: percentage(withAi),
      withoutAi,
      withoutAiPercentage: percentage(withoutAi),
      withManual,
      withManualPercentage: percentage(withManual),
    };
  }
}
