import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { dryRun, projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ProjectFilePath } from '@/cli/services/FileService.ts';
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
  readContextFile,
  type StringContextRecord,
} from '@/cli/utils/aiContext.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import { type Output, resolveOutputFormat } from '@/cli/utils/output.ts';
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
import {
  type ContextChange,
  type ContextStats,
  contextChangeView,
  contextStatusByFilePlainView,
  contextStatusByFileTable,
  contextStatusFooter,
  contextStatusPlainView,
  contextStatusTable,
  contextStatusTitle,
  type FileContextStats,
  savedPathView,
} from './views.ts';

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
  filePaths: Map<number, ProjectFilePath>;
}

const BATCH_SIZE = 100;
const SINCE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const AVAILABLE_STATUSES = ['empty', 'ai', 'manual'];

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
    // The download rewrites this path wholesale, so a target that holds something other than a
    // context file has to stop the run — otherwise the first download silently destroys it.
    const existingRecords = (await Bun.file(options.to).exists()) ? await this.readContextRecords(options.to) : [];
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
          file: isStringsBased ? '' : this.toFilePath(filePaths.get(entry.fileId)),
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

    output.item(options.to, savedPathView);
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadOptions;

    if (!(await Bun.file(options.from).exists())) {
      throw new CliError(`File '${options.from}' not found in the Crowdin project`);
    }

    const output = this.getOutput(command);
    let records = await this.readContextRecords(options.from);
    const readCount = records.length;

    if (!options.overwrite) {
      records = records.filter((record) => record.ai_context !== '');
    }

    const recordsWithContext = records.map((record) => ({
      record,
      context: fullContext(record.context, record.ai_context),
    }));

    const changes: ContextChange[] = recordsWithContext.map(({ record, context }) => ({
      id: record.id,
      text: record.text,
      context,
    }));

    // Nothing to patch — the run is already over, so say so instead of exiting silently. Checked
    // ahead of the dry run, which was just as silent on an empty file.
    if (changes.length === 0) {
      output.list(changes, contextChangeView(), {
        empty:
          readCount === 0
            ? `No strings found in '${options.from}'`
            : `No strings with AI context found in '${options.from}'`,
      });
      return;
    }

    // A dry run's whole output is this list, so it renders in every format — a json consumer that
    // saw nothing here would read 'no changes pending' from a run that is about to rewrite context.
    if (options.dryrun) {
      output.list(changes, contextChangeView(' would be uploaded'));
      return;
    }

    const patch: PatchRequest[] = recordsWithContext.map(({ record, context }) => ({
      op: 'replace',
      path: `/${record.id}/context`,
      value: context,
    }));

    await this.applyBatches(command, output, patch);

    // Text already streamed its per-batch progress; the machine formats get what was written.
    if (isMachineFormat(options.output)) {
      output.list(changes, contextChangeView());
    }
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
      // An early exit still owes the machine formats a document: 'bailed' is carried by the exit
      // code and the stderr diagnostic, not by an absent stdout, which reads as an empty result.
      output.list([], contextChangeView());
      return;
    }

    output.success(`Downloaded ${withAiContext.length} strings`);

    const changes: ContextChange[] = withAiContext.map((entry) => ({
      id: entry.id,
      text: getStringText(entry.text),
      context: getManualContext(entry.context),
    }));

    // Same as upload: reset drops every AI context it finds, so a dry run that prints nothing in
    // json/toon/plain is the most misleading output this command can produce.
    if (options.dryrun) {
      output.list(changes, contextChangeView(' would be updated'));
      return;
    }

    const patch: PatchRequest[] = withAiContext.map((entry) => ({
      op: 'replace',
      path: `/${entry.id}/context`,
      value: getManualContext(entry.context),
    }));

    await this.applyBatches(command, output, patch);

    if (isMachineFormat(options.output)) {
      output.list(changes, contextChangeView());
    }
  };

  statusAction = async (command: Command) => {
    const options = command.optsWithGlobals() as StatusOptions;

    this.validateSince(options.since);

    const output = this.getOutput(command);
    const { project, isStringsBased, strings, filePaths } = await this.fetchFilteredStrings(command, options);
    const byFile = Boolean(options.byFile) && !isStringsBased;
    const isText = resolveOutputFormat(options.output) === 'text';

    if (byFile) {
      const stats = this.byFileStats(strings, filePaths);

      if (isText) {
        output.success(contextStatusTitle(project));
        output.grid(contextStatusByFileTable(stats));
        output.info(contextStatusFooter);
        return;
      }

      output.item(stats, contextStatusByFilePlainView(), { mark: false });
      return;
    }

    const stats = this.calculateStats(strings);

    if (isText) {
      this.printStatusTable(output, project, contextStatusTable(stats));
      return;
    }

    output.item(stats, contextStatusPlainView(), { mark: false });
  };

  private printStatusTable(output: Output, project: ProjectsGroupsModel.Project, table: object): void {
    output.success(contextStatusTitle(project));
    output.table(table);
    output.info(contextStatusFooter);
  }

  /**
   * The path a file is listed under here. Unlike `string list`, which prints the branch as its own
   * line, this command keys a grid and a JSONL record by the path alone — so a branch file keeps the
   * branch in front of it, or two branches' copies of the same file would collapse into one row.
   */
  private toFilePath(file?: ProjectFilePath): string {
    if (!file) {
      return '';
    }

    return file.branch ? `/${file.branch}${file.path}` : file.path;
  }

  // Grouped by file id, not by path: two branches hold the same path, and grouping by it would
  // merge their strings into one row.
  private groupByFile(strings: SourceStringsModel.String[]): Map<number | undefined, SourceStringsModel.String[]> {
    const grouped = new Map<number | undefined, SourceStringsModel.String[]>();

    for (const entry of strings) {
      const group = grouped.get(entry.fileId) ?? [];

      group.push(entry);
      grouped.set(entry.fileId, group);
    }

    return grouped;
  }

  private byFileStats(
    strings: SourceStringsModel.String[],
    filePaths: Map<number, ProjectFilePath>,
  ): FileContextStats[] {
    return [...this.groupByFile(strings).entries()].map(([fileId, group]) => {
      const file = fileId === undefined ? undefined : filePaths.get(fileId);

      return {
        file: file?.path ?? '',
        branch: file?.branch,
        ...this.calculateStats(group),
      };
    });
  }

  private async fetchFilteredStrings(command: Command, options: FilterOptions): Promise<FilteredStrings> {
    const projectService = await this.getProjectService(command);
    const stringService = await this.getStringService(command);
    const branchService = await this.getBranchService(command);
    const labelService = await this.getLabelService(command);
    const fileService = await this.getFileService(command);

    const project = (await projectService.loadProject()).data;
    const isStringsBased = project.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const branch = await branchService.resolveBranch(options.branch);
    const branchId = branch?.id;
    const labelIds = await labelService.resolveLabelIds(toArray(options.label), false);
    const filePaths = isStringsBased
      ? new Map<number, ProjectFilePath>()
      : await fileService.listProjectFilePaths(branch);
    const fileFilters = toArray(options.file);

    const baseParams: SourceStringsModel.ListProjectStringsOptions = {
      ...(branchId !== undefined ? { branchId } : {}),
      ...(labelIds?.length ? { labelIds: labelIds.join(',') } : {}),
      ...(options.croql ? { croql: options.croql } : {}),
    };

    let strings: SourceStringsModel.String[] = [];

    if (!isStringsBased && fileFilters.length > 0) {
      // A file filter that matches nothing yields no strings. The Java CLI
      // falls back to all project strings for 'status' and 'reset' in that
      // case — an intentional divergence: silently widening the scope of a
      // destructive 'reset' to the whole project is unsafe.
      // Matched against the branch-relative path: a '--file' glob never carries a branch, the same
      // as everywhere else in the CLI.
      const fileIds = [...filePaths.entries()]
        .filter(([, file]) => fileFilters.some((filter) => isPathMatch(file.path, filter)))
        .map(([id]) => id);
      // fileId already scopes the query to the branch the file lives in, and the API refuses the
      // two together ("Field [branchId] must not be set with the current field").
      const { branchId: _scopedByFile, ...fileParams } = baseParams;

      for (const fileId of fileIds) {
        strings.push(...(await stringService.list({ ...fileParams, fileId })));
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

  /**
   * A line that holds no record fails the read, rather than being skipped as the Java CLI skips it:
   * both callers rewrite the file they read, so a dropped line is an upload that silently sends
   * less than the file holds, or a download that recomputes the ai_context that line carried and
   * then overwrites it. Nothing parsed at all means the file is not a context file to begin with —
   * a glossary, an XLIFF — which is worth saying instead of pointing at its first line.
   */
  private async readContextRecords(filePath: string): Promise<StringContextRecord[]> {
    const { records, firstInvalidLine } = await readContextFile(filePath);

    if (firstInvalidLine === undefined) {
      return records;
    }

    if (records.length === 0) {
      throw new CliError(
        `File '${filePath}' is not a context file. Expected the JSONL format written by 'crowdin context download'`,
      );
    }

    throw new CliError(
      `File '${filePath}' contains an invalid record at line ${firstInvalidLine}. Expected the JSONL format written by 'crowdin context download'`,
    );
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
    // No strings at all means no percentage to report; dividing anyway printed 'NaN'.
    const percentage = (value: number) => (total === 0 ? '0.00' : ((value / total) * 100).toFixed(2));

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
