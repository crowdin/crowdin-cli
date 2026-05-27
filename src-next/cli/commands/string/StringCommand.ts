import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput, GetStringService } from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import branch from '../upload/options/branch.ts';

const identifierOption: OptionDef = {
  name: 'identifier',
  type: 'string',
  description: 'Set custom string identifier',
};

const maxLengthOption: OptionDef = {
  name: 'max-length',
  type: 'number',
  description: 'Set maximum translations length',
};

const contextOption: OptionDef = {
  name: 'context',
  type: 'string',
  description: 'Set context for translators',
};

const fileOption: OptionDef = {
  name: 'file',
  type: 'string',
  variadic: true,
  description: 'Set file paths in project',
};

const labelOption: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Specify label names',
};

const hiddenOption: OptionDef = {
  name: 'hidden',
  type: 'boolean',
  description: 'Mark string as hidden',
};

const noHiddenOption: OptionDef = {
  name: 'no-hidden',
  type: 'boolean',
  description: 'Unmark hidden flag',
};

const filterOption: OptionDef = {
  name: 'filter',
  type: 'string',
  description: 'Filter strings by text',
};

const croqlOption: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'Set CROQL query filter',
};

const directoryOption: OptionDef = {
  name: 'directory',
  type: 'string',
  description: 'Set directory path',
};

const scopeOption: OptionDef = {
  name: 'scope',
  type: 'string',
  description: 'Set search scope',
};

const oneOption: OptionDef = {
  name: 'one',
  type: 'string',
  description: 'Plural form for one',
};

const twoOption: OptionDef = {
  name: 'two',
  type: 'string',
  description: 'Plural form for two',
};

const fewOption: OptionDef = {
  name: 'few',
  type: 'string',
  description: 'Plural form for few',
};

const manyOption: OptionDef = {
  name: 'many',
  type: 'string',
  description: 'Plural form for many',
};

const zeroOption: OptionDef = {
  name: 'zero',
  type: 'string',
  description: 'Plural form for zero',
};

const textOption: OptionDef = {
  name: 'text',
  type: 'string',
  description: 'Set new string text',
};

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
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'string',
      description: 'Manage source strings',
      subcommands: [
        {
          name: 'list',
          description: 'List project source strings',
          options: [fileOption, filterOption, branch, labelOption, croqlOption, directoryOption, scopeOption],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new source string',
          arguments: [
            {
              name: 'text',
              description: 'Source string text',
            },
          ],
          options: [
            identifierOption,
            maxLengthOption,
            contextOption,
            fileOption,
            labelOption,
            branch,
            hiddenOption,
            oneOption,
            twoOption,
            fewOption,
            manyOption,
            zeroOption,
          ],
          action: this.addAction,
        },
        {
          name: 'delete',
          description: 'Delete source string by id',
          arguments: [
            {
              name: 'id',
              description: 'Numeric source string identifier',
            },
          ],
          action: this.deleteAction,
        },
        {
          name: 'edit',
          description: 'Edit source string by id',
          arguments: [
            {
              name: 'id',
              description: 'Numeric source string identifier',
            },
          ],
          options: [
            identifierOption,
            textOption,
            contextOption,
            maxLengthOption,
            labelOption,
            hiddenOption,
            noHiddenOption,
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
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const filePath = this.getSingleValue(options.file);
    const labelNames = this.toArray(options.label);
    const directory = options.directory;

    if (filePath && directory) {
      throw new CliError("The '--file' and '--directory' options can't be used together");
    }

    const isStringsBasedProject = await stringService.isStringsBasedProject();

    if (isStringsBasedProject && (filePath || directory)) {
      throw new CliError("The '--file' and '--directory' options are not supported for string-based projects");
    }

    const branchId = await stringService.resolveBranchId(options.branch, false);
    const directoryId = await stringService.resolveDirectoryId(directory, branchId);
    const labelIds = await stringService.resolveLabelIds(labelNames, false);
    const listFileId = filePath ? await this.resolveListFileId(stringService, filePath, branchId) : undefined;
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
      const labelsMap = await stringService.listLabelsMap();
      const filePaths = !isStringsBasedProject
        ? await stringService.listProjectFilePaths(branchId)
        : new Map<number, string>();
      output.table(
        strings.map((entry) => ({
          id: entry.id,
          identifier: entry.identifier ?? '',
          text: this.extractText(entry),
          file: entry.fileId !== undefined ? (filePaths.get(entry.fileId) ?? '') : '',
          labels: (entry.labelIds ?? [])
            .map((id: number) => labelsMap.get(id))
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
    const options = command.optsWithGlobals() as AddOptions;
    const [text] = command.args;
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const files = this.toArray(options.file);
    const labels = this.toArray(options.label);

    if (!text) {
      throw new CliError('Source string text can not be empty');
    }

    if (options.maxLength !== undefined && options.maxLength < 0) {
      throw new CliError("'--max-length' cannot be lower than 0");
    }

    const isStringsBasedProject = await stringService.isStringsBasedProject();
    const labelIds = await stringService.resolveLabelIds(labels, true);
    const isPluralString = this.isPlural(options);

    if (isStringsBasedProject) {
      if (files.length > 0) {
        throw new CliError("The '--file' option is not supported for string-based projects");
      }

      const branchId = await stringService.resolveBranchId(options.branch, true);

      if (branchId === undefined) {
        throw new CliError("The '--branch' option is required for string-based projects");
      }

      const request = this.buildStringsBasedAddRequest(text, options, labelIds, branchId);
      const result = isPluralString
        ? await stringService.addPluralStringsBased(request)
        : await stringService.addStringsBased(request);

      output.table([{ id: result.id, identifier: result.identifier ?? '', text: this.extractText(result) }]);
      return;
    }

    if (files.length === 0) {
      throw new CliError("The '--file' value can not be empty");
    }

    const branchId = await stringService.resolveBranchId(options.branch, false);
    const resolvedFiles = await stringService.resolveFileIds(files, branchId);

    for (const missingPath of resolvedFiles.missingPaths) {
      output.warning(`Project doesn't contain the '${missingPath}' file`);
    }

    if (resolvedFiles.fileIds.length === 0) {
      throw new CliError('No valid file specified for the string. At least one valid file is required');
    }

    const result: Array<{ id: number; identifier: string; text: string }> = [];

    for (const fileId of resolvedFiles.fileIds) {
      const request = this.buildFileBasedAddRequest(text, options, labelIds, fileId);
      const added = isPluralString ? await stringService.addPlural(request) : await stringService.add(request);

      result.push({
        id: added.id,
        identifier: added.identifier ?? '',
        text: this.extractText(added) || text,
      });
    }

    output.table(result);
  };

  editAction = async (command: Command) => {
    const options = command.optsWithGlobals() as EditOptions;
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const id = this.parseNumericId(idArg, 'Source string id can not be empty');
    const labelNames = this.toArray(options.label);
    const hasAnyPatch =
      options.text !== undefined ||
      options.context !== undefined ||
      options.maxLength !== undefined ||
      options.hidden !== undefined ||
      options.identifier !== undefined ||
      labelNames.length > 0;

    if (!hasAnyPatch) {
      throw new CliError('No fields to update. Specify at least one option to edit');
    }

    if (options.maxLength !== undefined && options.maxLength < 0) {
      throw new CliError("'--max-length' cannot be lower than 0");
    }

    const labelIds = await stringService.resolveLabelIds(labelNames, true);
    const patch = this.buildEditPatch(options, labelIds);
    const updated = await stringService.edit(id, patch);

    output.success(`Source string #${id} updated`);
    output.table([{ id: updated.id, identifier: updated.identifier ?? '', text: this.extractText(updated) }]);
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const id = this.parseNumericId(idArg, 'Source string id can not be empty');
    await stringService.delete(id);
    output.success(`Source string #${id} deleted`);
  };

  private async resolveListFileId(
    stringService: Awaited<ReturnType<GetStringService>>,
    filePath: string,
    branchId?: number,
  ): Promise<number> {
    const resolved = await stringService.resolveFileIds([filePath], branchId);
    const [fileId] = resolved.fileIds;

    if (!fileId) {
      throw new CliError(`File '${filePath}' not found`);
    }

    return fileId;
  }

  private parseNumericId(idArg: string | undefined, emptyMessage: string): number {
    if (!idArg) {
      throw new CliError(emptyMessage);
    }

    const id = Number(idArg);

    if (Number.isNaN(id)) {
      throw new CliError('Source string id must be numeric');
    }

    return id;
  }

  private buildFileBasedAddRequest(
    text: string,
    options: AddOptions,
    labelIds: number[] | undefined,
    fileId: number,
  ): SourceStringsModel.CreateStringRequest {
    const requestText = this.isPlural(options) ? this.buildPluralText(options) : text;
    const request: SourceStringsModel.CreateStringRequest = {
      text: requestText,
      fileId,
      ...(options.identifier ? { identifier: options.identifier } : {}),
      ...(options.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
      ...(options.context ? { context: options.context } : {}),
      ...(options.hidden !== undefined ? { isHidden: options.hidden } : {}),
      ...(labelIds && labelIds.length > 0 ? { labelIds } : {}),
    };

    return request;
  }

  private buildStringsBasedAddRequest(
    text: string,
    options: AddOptions,
    labelIds: number[] | undefined,
    branchId: number,
  ): SourceStringsModel.CreateStringStringsBasedRequest {
    const requestText = this.isPlural(options) ? this.buildPluralText(options) : text;
    const request: SourceStringsModel.CreateStringStringsBasedRequest = {
      text: requestText,
      branchId,
      identifier: options.identifier ?? text,
      ...(options.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
      ...(options.context ? { context: options.context } : {}),
      ...(options.hidden !== undefined ? { isHidden: options.hidden } : {}),
      ...(labelIds && labelIds.length > 0 ? { labelIds } : {}),
    };

    return request;
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

  private isPlural(options: AddOptions): boolean {
    return (
      options.one !== undefined ||
      options.two !== undefined ||
      options.few !== undefined ||
      options.many !== undefined ||
      options.zero !== undefined
    );
  }

  private buildPluralText(options: AddOptions): SourceStringsModel.PluralText {
    return {
      ...(options.one !== undefined ? { one: options.one } : {}),
      ...(options.two !== undefined ? { two: options.two } : {}),
      ...(options.few !== undefined ? { few: options.few } : {}),
      ...(options.many !== undefined ? { many: options.many } : {}),
      ...(options.zero !== undefined ? { zero: options.zero } : {}),
    };
  }

  private toArray(value: string | string[] | undefined): string[] {
    if (value === undefined || value === '') {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private getSingleValue(value: string | string[] | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    return Array.isArray(value) ? value[0] : value;
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
