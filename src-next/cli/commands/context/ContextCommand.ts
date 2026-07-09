import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { dryRun, projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetProjectService,
  GetStringService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
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
import {
  all as allOption,
  byFile as byFileOption,
  filter,
  from as fromOption,
  overwrite as overwriteOption,
  reset,
  status as statusOption,
  to as toOption,
} from './options.ts';

const BATCH_SIZE = 100;
const SINCE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const AVAILABLE_STATUSES = ['empty', 'ai', 'manual'];
const CONTEXT_STATUS_FOOTER = "Run 'crowdin context download --status=empty' to export strings needing context.";

// TODO: Java '--format' (file format) is intentionally not ported: 'jsonl' is the only supported value

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
            filter.file,
            filter.label,
            filter.branch,
            filter.croql,
            filter.since,
            statusOption,
            projectConfigGroup,
          ],
          action: this.downloadAction,
        },
        {
          name: 'upload',
          description: 'Upload strings context',
          options: [fromOption, overwriteOption, dryRun, projectConfigGroup],
          action: this.uploadAction,
        },
        {
          name: 'reset',
          description: 'Remove AI-generated context from strings, preserving manual context',
          options: [
            reset.file,
            reset.label,
            reset.branch,
            reset.croql,
            reset.since,
            dryRun,
            allOption,
            projectConfigGroup,
          ],
          action: this.resetAction,
        },
        {
          name: 'status',
          description: 'Show context coverage statistics',
          options: [
            filter.file,
            filter.label,
            filter.branch,
            filter.croql,
            filter.since,
            byFileOption,
            projectConfigGroup,
          ],
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
    const byFile = Boolean(options.byFile) && !isStringsBased;

    // Plain view mirrors Java's line-based report (padded columns, no console.table grid).
    if (options.output === 'plain') {
      output.report(byFile ? this.byFileReport(project, strings, filePaths) : this.summaryReport(project, strings));
      return;
    }

    // Text wraps a console.table grid in prose header/footer; json/toon emit the rows only
    // (output.log is text-gated).
    output.log(this.reportTitle(project));
    output.log('');
    output.table(byFile ? this.byFileRows(strings, filePaths) : this.summaryRow(strings));
    output.log('');
    output.log(CONTEXT_STATUS_FOOTER);
  };

  private groupByFile(
    strings: SourceStringsModel.String[],
    filePaths: Map<number, string>,
  ): Map<string, SourceStringsModel.String[]> {
    const grouped = new Map<string, SourceStringsModel.String[]>();

    for (const entry of strings) {
      const path = filePaths.get(entry.fileId) ?? '';
      const group = grouped.get(path) ?? [];

      group.push(entry);
      grouped.set(path, group);
    }

    return grouped;
  }

  private byFileRows(strings: SourceStringsModel.String[], filePaths: Map<number, string>) {
    return [...this.groupByFile(strings, filePaths).entries()].map(([file, group]) => {
      const stats = this.calculateStats(group);

      return {
        file,
        total: stats.total,
        aiContext: `${stats.withAi} (${stats.withAiPercentage}%)`,
        missing: stats.total - stats.withAi,
      };
    });
  }

  private summaryRow(strings: SourceStringsModel.String[]) {
    const stats = this.calculateStats(strings);

    return {
      totalStrings: stats.total,
      withAiContext: `${stats.withAi} (${stats.withAiPercentage}%)`,
      withoutAiContext: `${stats.withoutAi} (${stats.withoutAiPercentage}%)`,
      withManualContext: `${stats.withManual} (${stats.withManualPercentage}%)`,
    };
  }

  // Java ContextStatusAction byFile report: columns padded to the longest file path.
  private byFileReport(
    project: ProjectsGroupsModel.Project,
    strings: SourceStringsModel.String[],
    filePaths: Map<number, string>,
  ): string[] {
    const grouped = this.groupByFile(strings, filePaths);
    const width = Math.max(0, ...[...grouped.keys()].map((path) => path.length));
    const lines = [
      this.reportTitle(project),
      '',
      `${'File'.padEnd(width)}   ${'Total'.padStart(8)}   ${'AI Context'.padStart(14)}   ${'Missing'.padStart(8)}`,
    ];

    for (const [path, group] of grouped) {
      const stats = this.calculateStats(group);
      const aiContext = `${String(stats.withAi).padStart(6)} (${stats.withAiPercentage}%)`;

      lines.push(
        `${path.padEnd(width)}   ${String(stats.total).padStart(8)}   ${aiContext}   ${String(stats.total - stats.withAi).padStart(8)}`,
      );
    }

    lines.push('', CONTEXT_STATUS_FOOTER);

    return lines;
  }

  private summaryReport(project: ProjectsGroupsModel.Project, strings: SourceStringsModel.String[]): string[] {
    const stats = this.calculateStats(strings);

    return [
      this.reportTitle(project),
      '',
      `Total strings:       ${stats.total}`,
      `With AI context:     ${stats.withAi} (${stats.withAiPercentage}%)`,
      `Without AI context:  ${stats.withoutAi} (${stats.withoutAiPercentage}%)`,
      `With manual context: ${stats.withManual} (${stats.withManualPercentage}%)`,
      '',
      CONTEXT_STATUS_FOOTER,
    ];
  }

  private reportTitle(project: ProjectsGroupsModel.Project): string {
    return `Context Status for Project "${project.name}" (ID: ${project.id})`;
  }

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
