import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AddBundlePayload, BundleView } from '@/cli/services/BundleService.ts';
import type { GetBundleService, GetOutput } from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';

const fileFormatOption: OptionDef = {
  name: 'file-format',
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

type BundleGlobalOptions = GlobalOptions;

interface AddOptions extends BundleGlobalOptions {
  fileFormat?: string;
  source?: string | string[];
  ignore?: string | string[];
  translation?: string;
  label?: number | number[];
  includeSourceLanguage?: boolean;
  includePseudoLanguage?: boolean;
  multilingual?: boolean;
}

interface CloneOptions extends BundleGlobalOptions {
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
            fileFormatOption,
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
            fileFormatOption,
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

    output.table(
      bundles.map((bundle) => ({
        id: bundle.id,
        format: bundle.format ?? '',
        translation: bundle.exportPattern ?? '',
        name: bundle.name ?? '',
      })),
    );
  };

  addAction = async (command: Command) => {
    const options = command.opts() as AddOptions;
    const [name] = command.args;
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const sourcePatterns = this.toArray(options.source);

    if (!name) {
      throw new CliError("Bundle name can't be empty");
    }

    if (!options.fileFormat) {
      throw new CliError("'--file-format' can't be empty");
    }

    if (sourcePatterns.length === 0) {
      throw new CliError("'--source' can't be empty");
    }

    if (!options.translation) {
      throw new CliError("'--translation' can't be empty");
    }

    const payload: AddBundlePayload = {
      name,
      format: options.fileFormat,
      sourcePatterns,
      ...(this.toArray(options.ignore).length > 0 ? { ignorePatterns: this.toArray(options.ignore) } : {}),
      exportPattern: options.translation,
      ...(this.toNumberArray(options.label).length > 0 ? { labelIds: this.toNumberArray(options.label) } : {}),
      includeProjectSourceLanguage: options.includeSourceLanguage ?? false,
      includeInContextPseudoLanguage: options.includePseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? false,
    };
    const createdBundle = await bundleService.add(payload);

    output.table([this.toListRow(createdBundle)]);
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const id = this.parseNumericId(idArg);
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
    const options = command.opts() as CloneOptions;
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const id = this.parseNumericId(idArg);
    const bundleToClone = await bundleService.get(id);

    if (!bundleToClone) {
      output.warning("Couldn't find bundle by the specified ID");
      return;
    }

    const sourcePatterns = this.toArray(options.source);
    const ignorePatterns = this.toArray(options.ignore);
    const labelIds = this.toNumberArray(options.label);
    const payload: AddBundlePayload = {
      name: options.name ?? `${bundleToClone.name ?? ''} (clone)`,
      format: options.fileFormat ?? bundleToClone.format ?? '',
      sourcePatterns: sourcePatterns.length > 0 ? sourcePatterns : (bundleToClone.sourcePatterns ?? []),
      ...(ignorePatterns.length > 0
        ? { ignorePatterns }
        : bundleToClone.ignorePatterns !== undefined
          ? { ignorePatterns: bundleToClone.ignorePatterns }
          : {}),
      exportPattern: options.translation ?? bundleToClone.exportPattern ?? '',
      ...(labelIds.length > 0
        ? { labelIds }
        : bundleToClone.labelIds !== undefined
          ? { labelIds: bundleToClone.labelIds }
          : {}),
      includeProjectSourceLanguage:
        options.includeSourceLanguage ?? bundleToClone.includeProjectSourceLanguage ?? false,
      includeInContextPseudoLanguage:
        options.includePseudoLanguage ?? bundleToClone.includeInContextPseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? bundleToClone.isMultilingual ?? false,
    };
    const clonedBundle = await bundleService.add(payload);

    output.table([this.toListRow(clonedBundle)]);
  };

  browseAction = async (command: Command) => {
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const id = this.parseNumericId(idArg);
    const url = await bundleService.getBundleUrl(id);

    Bun.spawn(['open', url]);
    output.success(`Opened ${url} in browser`);
  };

  private parseNumericId(idArg: string | undefined): number {
    if (!idArg) {
      throw new CliError('Bundle id can not be empty');
    }

    const id = Number(idArg);

    if (Number.isNaN(id)) {
      throw new CliError('Bundle id must be numeric');
    }

    return id;
  }

  private toArray(value: string | string[] | undefined): string[] {
    if (value === undefined || value === '') {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private toNumberArray(value: number | number[] | undefined): number[] {
    if (value === undefined) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private toListRow(bundle: BundleView): Record<string, unknown> {
    return {
      id: bundle.id,
      format: bundle.format ?? '',
      translation: bundle.exportPattern ?? '',
      name: bundle.name ?? '',
    };
  }
}
