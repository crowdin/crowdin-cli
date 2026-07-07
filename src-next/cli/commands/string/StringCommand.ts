import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { branch, projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetDirectoryService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetStringService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { parseNumericId, toArray } from '@/cli/utils/parsing.ts';
import { add, edit, list } from './options.ts';

const PLURAL_KEYS = ['one', 'two', 'few', 'many', 'zero'] as const;

interface ListOptions extends GlobalOptions {
  file?: string | string[];
  filter?: string;
  branch?: string;
  label?: string | string[];
  croql?: string;
  directory?: string;
  scope?: SourceStringsModel.Scope;
}

interface AddOptions extends GlobalOptions {
  identifier?: string;
  maxLength?: number;
  context?: string;
  file?: string | string[];
  label?: string | string[];
  branch?: string;
  hidden?: boolean;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  zero?: string;
}

interface EditOptions extends GlobalOptions {
  identifier?: string;
  text?: string;
  context?: string;
  maxLength?: number;
  label?: string | string[];
  hidden?: boolean;
}

export default class StringCommand {
  constructor(
    private getOutput: GetOutput,
    private getStringService: GetStringService,
    private getBranchService: GetBranchService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'string',
      description: 'Manage source strings in a Crowdin project',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of source strings',
          options: [
            list.file,
            list.filter,
            branch,
            list.label,
            list.croql,
            list.directory,
            list.scope,
            projectConfigGroup,
          ],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new source string',
          arguments: [
            {
              name: 'text',
              description: 'Set text for the new source string',
            },
          ],
          options: [
            add.identifier,
            add.maxLength,
            add.context,
            add.file,
            add.label,
            branch,
            add.hidden,
            add.one,
            add.two,
            add.few,
            add.many,
            add.zero,
            projectConfigGroup,
          ],
          action: this.addAction,
        },
        {
          name: 'delete',
          description: 'Delete source string',
          arguments: [
            {
              name: 'id',
              description: 'Numeric string identifier',
            },
          ],
          options: [projectConfigGroup],
          action: this.deleteAction,
        },
        {
          name: 'edit',
          description: 'Edit existing source string',
          arguments: [
            {
              name: 'id',
              description: 'Numeric string identifier',
            },
          ],
          options: [
            edit.identifier,
            edit.text,
            edit.context,
            edit.maxLength,
            edit.label,
            edit.hidden,
            edit.noHidden,
            projectConfigGroup,
          ],
          action: this.editAction,
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
    const filePath = Array.isArray(options.file) ? options.file[0] : options.file;
    const labelNames = toArray(options.label);
    const directory = options.directory;

    if (filePath && directory) {
      throw new CliError("The '--file' and '--directory' options can't be used together");
    }

    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const branchService = await this.getBranchService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const isStringsBased = await stringService.isStringsBasedProject();

    if (isStringsBased && (filePath || directory)) {
      throw new CliError("The '--file' and '--directory' options are not supported for string-based projects");
    }

    const branchId = await branchService.resolveBranchId(options.branch);
    const directoryId = await directoryService.resolveDirectoryId(directory, branchId);
    const labelIds = await labelService.resolveLabelIds(labelNames, false);
    const listFileId = filePath ? await this.resolveSingleFileId(fileService, filePath, branchId) : undefined;
    const strings = await stringService.list({
      ...(listFileId !== undefined ? { fileId: listFileId } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
      ...(labelIds?.length ? { labelIds: labelIds.join(',') } : {}),
      ...(options.filter ? { filter: options.filter } : {}),
      ...(options.croql ? { croql: options.croql } : {}),
      ...(directoryId !== undefined ? { directoryId } : {}),
      ...(options.scope ? { scope: options.scope } : {}),
    });

    if (strings.length === 0) {
      output.success('No source strings found');
      return;
    }

    if (options.verbose) {
      const labelsMap = await labelService.listLabelsMap();
      const filePaths = !isStringsBased ? await fileService.listProjectFilePaths(branchId) : new Map<number, string>();

      output.table(
        strings.map((entry) => ({
          id: entry.id,
          identifier: entry.identifier ?? '',
          text: this.extractText(entry),
          file: entry.fileId !== undefined ? (filePaths.get(entry.fileId) ?? '') : '',
          labels: (entry.labelIds ?? [])
            .map((id) => labelsMap.get(id))
            .filter(Boolean)
            .join(', '),
          context: entry.context ?? '',
        })),
      );
      return;
    }

    output.table(
      strings.map((entry) => ({
        id: entry.id,
        identifier: entry.identifier ?? '',
        text: this.extractText(entry),
      })),
    );
  };

  addAction = async (command: Command) => {
    const [text] = command.args;
    const options = command.optsWithGlobals() as AddOptions;

    if (!text) {
      throw new CliError('Source string text can not be empty');
    }

    if (options.maxLength !== undefined && options.maxLength < 0) {
      throw new CliError("'--max-length' cannot be lower than 0");
    }

    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const files = toArray(options.file);
    const labels = toArray(options.label);
    const isStringsBased = await stringService.isStringsBasedProject();
    const labelIds = await labelService.resolveLabelIds(labels);
    const isPlural = PLURAL_KEYS.some((key) => options[key] !== undefined);
    const requestText = isPlural ? this.buildPluralText(options) : text;

    if (isStringsBased) {
      if (files.length > 0) {
        throw new CliError("The '--file' option is not supported for string-based projects");
      }

      const branchId = await branchService.resolveBranchId(options.branch, true);

      if (branchId === undefined) {
        throw new CliError("The '--branch' option is required for string-based projects");
      }

      const added = await stringService.add(
        this.buildStringsBasedRequest(requestText, text, options, labelIds, branchId),
      );

      output.table([{ id: added.id, identifier: added.identifier ?? '', text: this.extractText(added) }]);
      return;
    }

    if (files.length === 0) {
      throw new CliError("The '--file' value can not be empty");
    }

    const branchId = await branchService.resolveBranchId(options.branch);
    const resolved = await fileService.resolveFileIds(files, branchId);

    for (const missing of resolved.missingPaths) {
      output.warning(`Project doesn't contain the '${missing}' file`);
    }

    if (resolved.fileIds.length === 0) {
      throw new CliError('No valid file specified for the string. At least one valid file is required');
    }

    const result: Array<{ id: number; identifier: string; text: string }> = [];

    for (const fileId of resolved.fileIds) {
      const added = await stringService.add(this.buildFileBasedRequest(requestText, options, labelIds, fileId));

      result.push({
        id: added.id,
        identifier: added.identifier ?? '',
        text: this.extractText(added) || text,
      });
    }

    output.table(result);
  };

  editAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Source string');
    const options = command.optsWithGlobals() as EditOptions;
    const labelNames = toArray(options.label);
    const hasPatch =
      options.text !== undefined ||
      options.context !== undefined ||
      options.maxLength !== undefined ||
      options.hidden !== undefined ||
      options.identifier !== undefined ||
      labelNames.length > 0;

    if (!hasPatch) {
      throw new CliError('Specify some parameters to edit the string');
    }

    if (options.maxLength !== undefined && options.maxLength < 0) {
      throw new CliError("'--max-length' cannot be lower than 0");
    }

    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const labelService = await this.getLabelService(command);
    const labelIds = await labelService.resolveLabelIds(labelNames);
    const patch = this.buildEditPatch(options, labelIds);
    const updated = await stringService.edit(id, patch);

    output.success(`Source string #${id} was updated successfully`);
    output.table([{ id: updated.id, identifier: updated.identifier ?? '', text: this.extractText(updated) }]);
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Source string');
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);

    await stringService.delete(id);
    output.success(`Source string #${id} was deleted successfully`);
  };

  private async resolveSingleFileId(
    fileService: Awaited<ReturnType<GetFileService>>,
    filePath: string,
    branchId?: number,
  ): Promise<number> {
    const resolved = await fileService.resolveFileIds([filePath], branchId);
    const [fileId] = resolved.fileIds;

    if (!fileId) {
      throw new CliError(`File '${filePath}' not found`);
    }

    return fileId;
  }

  private buildFileBasedRequest(
    text: string | SourceStringsModel.PluralText,
    options: AddOptions,
    labelIds: number[] | undefined,
    fileId: number,
  ): SourceStringsModel.CreateStringRequest {
    return {
      text,
      fileId,
      ...(options.identifier ? { identifier: options.identifier } : {}),
      ...(options.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
      ...(options.context ? { context: options.context } : {}),
      ...(options.hidden !== undefined ? { isHidden: options.hidden } : {}),
      ...(labelIds && labelIds.length > 0 ? { labelIds } : {}),
    };
  }

  private buildStringsBasedRequest(
    text: string | SourceStringsModel.PluralText,
    fallbackIdentifier: string,
    options: AddOptions,
    labelIds: number[] | undefined,
    branchId: number,
  ): SourceStringsModel.CreateStringStringsBasedRequest {
    return {
      text,
      branchId,
      identifier: options.identifier ?? fallbackIdentifier,
      ...(options.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
      ...(options.context ? { context: options.context } : {}),
      ...(options.hidden !== undefined ? { isHidden: options.hidden } : {}),
      ...(labelIds && labelIds.length > 0 ? { labelIds } : {}),
    };
  }

  private buildEditPatch(options: EditOptions, labelIds: number[] | undefined): PatchRequest[] {
    const patch: PatchRequest[] = [];

    if (options.text !== undefined) {
      patch.push({ op: 'replace', path: '/text', value: options.text });
    }

    if (options.context !== undefined) {
      patch.push({ op: 'replace', path: '/context', value: options.context });
    }

    if (options.maxLength !== undefined) {
      patch.push({ op: 'replace', path: '/maxLength', value: options.maxLength });
    }

    if (options.hidden !== undefined) {
      patch.push({ op: 'replace', path: '/isHidden', value: options.hidden });
    }

    if (options.identifier !== undefined) {
      patch.push({ op: 'replace', path: '/identifier', value: options.identifier });
    }

    if (labelIds !== undefined) {
      patch.push({ op: 'replace', path: '/labelIds', value: labelIds });
    }

    return patch;
  }

  private buildPluralText(options: AddOptions): SourceStringsModel.PluralText {
    const plural: SourceStringsModel.PluralText = {};

    for (const key of PLURAL_KEYS) {
      const value = options[key];

      if (value !== undefined) {
        plural[key] = value;
      }
    }

    return plural;
  }

  private extractText(entry: SourceStringsModel.String): string {
    const text = entry.text;

    if (typeof text === 'string') {
      return text;
    }

    if (!text || typeof text !== 'object') {
      return '';
    }

    return text.one ?? text.other ?? Object.values(text)[0] ?? '';
  }
}
