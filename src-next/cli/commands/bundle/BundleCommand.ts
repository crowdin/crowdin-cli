import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AddBundlePayload, BundleView } from '@/cli/services/BundleService.ts';
import type { GetBundleService, GetOutput } from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import { openUrl } from '@/cli/utils/open.ts';
import { parseNumericId, toArray, toNumberArray } from '@/cli/utils/parsing.ts';

const formatOption: OptionDef = {
  name: 'format',
  type: 'string',
  description: 'Set bundle format',
};

const sourceOption: OptionDef = {
  name: 'source',
  type: 'string',
  variadic: true,
  description: 'Set source patterns',
};

const ignoreOption: OptionDef = {
  name: 'ignore',
  type: 'string',
  variadic: true,
  description: 'Set ignore patterns',
};

const translationOption: OptionDef = {
  name: 'translation',
  type: 'string',
  description: 'Set translation export pattern',
};

const labelOption: OptionDef = {
  name: 'label',
  type: 'number',
  variadic: true,
  description: 'Specify label identifiers',
};

const nameOption: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'Set bundle name',
};

const includeSourceLanguageOption: OptionDef = {
  name: 'include-source-language',
  type: 'boolean',
  description: 'Include source language into bundle',
};

const includePseudoLanguageOption: OptionDef = {
  name: 'include-pseudo-language',
  type: 'boolean',
  description: 'Include pseudo-language into bundle',
};

const multilingualOption: OptionDef = {
  name: 'multilingual',
  type: 'boolean',
  description: 'Enable multilingual mode',
};

interface BundleOptions extends GlobalOptions {
  name?: string;
  fileFormat?: string;
  source?: string | string[];
  ignore?: string | string[];
  translation?: string;
  label?: number | number[];
  includeSourceLanguage?: boolean;
  includePseudoLanguage?: boolean;
  multilingual?: boolean;
}

export default class BundleCommand {
  constructor(
    private getOutput: GetOutput,
    private getBundleService: GetBundleService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'bundle',
      description: 'Manage translation bundles',
      subcommands: [
        {
          name: 'list',
          description: 'List bundles',
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new bundle',
          arguments: [
            {
              name: 'name',
              description: 'Bundle name',
            },
          ],
          options: [
            formatOption,
            sourceOption,
            ignoreOption,
            translationOption,
            labelOption,
            includeSourceLanguageOption,
            { ...includePseudoLanguageOption, default: true },
            multilingualOption,
          ],
          action: this.addAction,
        },
        {
          name: 'delete',
          description: 'Delete bundle by id',
          arguments: [
            {
              name: 'id',
              description: 'Numeric bundle identifier',
            },
          ],
          action: this.deleteAction,
        },
        {
          name: 'download',
          description: 'Download bundle by id',
          arguments: [
            {
              name: 'id',
              description: 'Numeric bundle identifier',
            },
          ],
          action: this.downloadAction,
        },
        {
          name: 'clone',
          description: 'Clone bundle by id',
          arguments: [
            {
              name: 'id',
              description: 'Numeric bundle identifier',
            },
          ],
          options: [
            nameOption,
            formatOption,
            sourceOption,
            ignoreOption,
            translationOption,
            labelOption,
            includeSourceLanguageOption,
            includePseudoLanguageOption,
            multilingualOption,
          ],
          action: this.cloneAction,
        },
        {
          name: 'browse',
          description: 'Open bundle in browser',
          arguments: [
            {
              name: 'id',
              description: 'Numeric bundle identifier',
            },
          ],
          action: this.browseAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const bundles = await bundleService.list();

    if (bundles.length === 0) {
      output.success('No bundles found');
      return;
    }

    output.table(bundles.map(this.toRow));
  };

  addAction = async (command: Command) => {
    const [name] = command.args;
    const options = command.opts() as BundleOptions;
    const sourcePatterns = toArray(options.source);

    if (!name) {
      throw new CliError("Bundle name can't be empty");
    }

    if (!options.fileFormat) {
      throw new CliError("'--format' can't be empty");
    }

    if (sourcePatterns.length === 0) {
      throw new CliError("'--source' can't be empty");
    }

    if (!options.translation) {
      throw new CliError("'--translation' can't be empty");
    }

    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const ignorePatterns = toArray(options.ignore);
    const labelIds = toNumberArray(options.label, "'--label' value must be numeric");
    const payload: AddBundlePayload = {
      name,
      format: options.fileFormat,
      sourcePatterns,
      ...(ignorePatterns.length > 0 ? { ignorePatterns } : {}),
      exportPattern: options.translation,
      ...(labelIds.length > 0 ? { labelIds } : {}),
      includeProjectSourceLanguage: options.includeSourceLanguage ?? false,
      includeInContextPseudoLanguage: options.includePseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? false,
    };
    const created = await bundleService.add(payload);

    output.table([this.toRow(created)]);
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Bundle');
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const bundleToDelete = await bundleService.get(id);

    if (!bundleToDelete) {
      output.warning("Couldn't find bundle by the specified ID");
      return;
    }

    await bundleService.delete(id);
    output.success(`Bundle #${id} deleted`);
  };

  downloadAction = async (_command: Command) => {
    throw new CliError('Bundle download command is not implemented yet');
  };

  cloneAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Bundle');
    const options = command.opts() as BundleOptions;
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const source = await bundleService.get(id);

    if (!source) {
      output.warning("Couldn't find bundle by the specified ID");
      return;
    }

    const sourcePatterns = toArray(options.source);
    const ignorePatterns = toArray(options.ignore);
    const labelIds = toNumberArray(options.label, "'--label' value must be numeric");
    const payload: AddBundlePayload = {
      name: options.name ?? `${source.name ?? ''} (clone)`,
      format: options.fileFormat ?? source.format ?? '',
      sourcePatterns: sourcePatterns.length > 0 ? sourcePatterns : (source.sourcePatterns ?? []),
      ...(ignorePatterns.length > 0
        ? { ignorePatterns }
        : source.ignorePatterns !== undefined
          ? { ignorePatterns: source.ignorePatterns }
          : {}),
      exportPattern: options.translation ?? source.exportPattern ?? '',
      ...(labelIds.length > 0 ? { labelIds } : source.labelIds !== undefined ? { labelIds: source.labelIds } : {}),
      includeProjectSourceLanguage: options.includeSourceLanguage ?? source.includeProjectSourceLanguage ?? false,
      includeInContextPseudoLanguage: options.includePseudoLanguage ?? source.includeInContextPseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? source.isMultilingual ?? false,
    };
    const cloned = await bundleService.add(payload);

    output.table([this.toRow(cloned)]);
  };

  browseAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Bundle');
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const url = await bundleService.getBundleUrl(id);

    openUrl(url);

    output.success(`Opened ${url} in browser`);
  };

  private toRow(bundle: BundleView): Record<string, unknown> {
    return {
      id: bundle.id,
      format: bundle.format ?? '',
      translation: bundle.exportPattern ?? '',
      name: bundle.name ?? '',
    };
  }
}
