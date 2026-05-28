import type { PatchRequest, SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput, GetProjectService, GetStringService } from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import { parseNumericId, toArray } from '@/cli/utils/parsing.ts';
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
    private getProjectService: GetProjectService,
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
    const filePath = Array.isArray(options.file) ? options.file[0] : options.file;
    const labelNames = toArray(options.label);
    const directory = options.directory;

    if (filePath && directory) {
      throw new CliError("The '--file' and '--directory' options can't be used together");
    }

    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const projectService = await this.getProjectService(command);
    const isStringsBased = await stringService.isStringsBasedProject();

    if (isStringsBased && (filePath || directory)) {
      throw new CliError("The '--file' and '--directory' options are not supported for string-based projects");
    }

    const branchId = await projectService.branch.resolveBranchId(options.branch);
    const directoryId = await projectService.directory.resolveDirectoryId(directory, branchId);
    const labelIds = await projectService.label.resolveLabelIds(labelNames, false);
    const listFileId = filePath ? await this.resolveSingleFileId(projectService, filePath, branchId) : undefined;
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
      const labelsMap = await projectService.label.listLabelsMap();
      const filePaths = !isStringsBased
        ? await projectService.file.listProjectFilePaths(branchId)
        : new Map<number, string>();

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
    const projectService = await this.getProjectService(command);
    const files = toArray(options.file);
    const labels = toArray(options.label);
    const isStringsBased = await stringService.isStringsBasedProject();
    const labelIds = await projectService.label.resolveLabelIds(labels);
    const isPlural = PLURAL_KEYS.some((key) => options[key] !== undefined);
    const requestText = isPlural ? this.buildPluralText(options) : text;

    if (isStringsBased) {
      if (files.length > 0) {
        throw new CliError("The '--file' option is not supported for string-based projects");
      }

      const branchId = await projectService.branch.resolveBranchId(options.branch, true);

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

    const branchId = await projectService.branch.resolveBranchId(options.branch);
    const resolved = await projectService.file.resolveFileIds(files, branchId);

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
      throw new CliError('No fields to update. Specify at least one option to edit');
    }

    if (options.maxLength !== undefined && options.maxLength < 0) {
      throw new CliError("'--max-length' cannot be lower than 0");
    }

    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);
    const projectService = await this.getProjectService(command);
    const labelIds = await projectService.label.resolveLabelIds(labelNames);
    const patch = this.buildEditPatch(options, labelIds);
    const updated = await stringService.edit(id, patch);

    output.success(`Source string #${id} updated`);
    output.table([{ id: updated.id, identifier: updated.identifier ?? '', text: this.extractText(updated) }]);
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Source string');
    const output = this.getOutput(command);
    const stringService = await this.getStringService(command);

    await stringService.delete(id);
    output.success(`Source string #${id} deleted`);
  };

  private async resolveSingleFileId(
    projectService: Awaited<ReturnType<GetProjectService>>,
    filePath: string,
    branchId?: number,
  ): Promise<number> {
    const resolved = await projectService.file.resolveFileIds([filePath], branchId);
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
