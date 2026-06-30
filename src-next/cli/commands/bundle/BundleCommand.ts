import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AddBundlePayload, BundleView } from '@/cli/services/BundleService.ts';
import type { GetBundleService, GetConfig, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { openUrl } from '@/cli/utils/open.ts';
import { parseNumericId, toArray, toNumberArray } from '@/cli/utils/parsing.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
import { dryRun } from '../common/options.ts';
import { keepArchive } from '../download/options.ts';
import {
  format as formatOption,
  ignore as ignoreOption,
  includePseudoLanguage as includePseudoLanguageOption,
  includeSourceLanguage as includeSourceLanguageOption,
  label as labelOption,
  multilingual as multilingualOption,
  name as nameOption,
  source as sourceOption,
  translation as translationOption,
} from './options.ts';

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
  keepArchive?: boolean;
  dryrun?: boolean;
}

export default class BundleCommand {
  constructor(
    private getOutput: GetOutput,
    private getBundleService: GetBundleService,
    private getConfig: GetConfig,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'bundle',
      description: 'Manage translation bundles',
      subcommands: [
        {
          name: 'list',
          description: 'List bundles',
          options: [projectConfigGroup],
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
            projectConfigGroup,
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
          options: [projectConfigGroup],
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
          options: [keepArchive, dryRun, projectConfigGroup],
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
            projectConfigGroup,
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
          options: [projectConfigGroup],
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

  downloadAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Bundle');
    const options = command.optsWithGlobals() as BundleOptions;
    const output = this.getOutput(command);
    const config = await this.getConfig(command);
    const bundleService = await this.getBundleService(command);

    const bundle = await bundleService.get(id);

    if (!bundle) {
      output.warning("Couldn't find bundle by the specified ID");
      return;
    }

    // Trigger the export and poll until the server reports completion (mirrors Java's spinner loop).
    output.spinner('bundle-build', 'start', 'Building bundle');
    let status = await bundleService.startExport(id);

    while (status.status.toLowerCase() !== 'finished') {
      if (status.status.toLowerCase() === 'failed') {
        output.spinner('bundle-build', 'error', 'Build has failed');
        throw new CliError('Failed to build bundle');
      }

      output.spinner('bundle-build', 'message', `Building bundle: ${status.progress}%`);
      await Bun.sleep(1000);
      status = await bundleService.checkExportStatus(id, status.identifier);
    }

    output.spinner('bundle-build', 'stop', 'Building bundle: 100%');

    // Archive and extracted files both land under basePath (matches `download` keep-archive behaviour).
    const archivePath = path.join(config.basePath, `bundle-${status.identifier}.zip`);
    const downloadUrl = await bundleService.getDownloadUrl(id, status.identifier);
    const response = await fetch(downloadUrl);

    await Bun.write(archivePath, response);
    output.success(`Bundle #${bundle.id} (${bundle.name}) downloaded`);

    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

    if (options.dryrun) {
      // Dry run lists archive contents without writing anything to disk.
      for (const entry of entries) {
        output.log(toPosixPath(entry.entryName).replace(/^\//, ''));
      }
    } else {
      for (const entry of entries) {
        const relativePath = toPosixPath(entry.entryName).replace(/^\//, '');
        const targetPath = path.join(config.basePath, relativePath);

        await mkdir(path.dirname(targetPath), { recursive: true });
        await Bun.write(targetPath, entry.getData());
        output.success(relativePath);
      }
    }

    if (options.keepArchive) {
      if (options.output === 'plain') {
        output.log(archivePath);
      } else {
        output.success(`Archive saved to ${archivePath}`);
      }
    } else {
      try {
        await rm(archivePath, { force: true });
      } catch {
        output.warning(`Failed to delete archive ${archivePath}`);
      }
    }
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
