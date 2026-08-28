import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import { pathView } from '@/cli/commands/common/views.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AddBundlePayload, BundleView } from '@/cli/services/BundleService.ts';
import type { GetBundleService, GetConfig, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { colors } from '@/cli/utils/colors.ts';
import { downloadToFile } from '@/cli/utils/downloadToFile.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import { openUrl } from '@/cli/utils/open.ts';
import type { View } from '@/cli/utils/output.ts';
import { parseNumericId, toArray, toNumberArray } from '@/cli/utils/parsing.ts';
import { stripLeadingSlashes, toPosixPath } from '@/lib/utils/path.ts';
import { dryRun } from '../common/options.ts';
import { keepArchive } from '../download/options.ts';
import {
  exportPattern as exportPatternOption,
  format as formatOption,
  ignorePattern as ignorePatternOption,
  includePseudoLanguage as includePseudoLanguageOption,
  includeSourceLanguage as includeSourceLanguageOption,
  label as labelOption,
  multilingual as multilingualOption,
  name as nameOption,
  sourcePattern as sourcePatternOption,
} from './options.ts';

interface BundleOptions extends GlobalOptions {
  name?: string;
  format?: string;
  sourcePattern?: string | string[];
  ignorePattern?: string | string[];
  exportPattern?: string;
  label?: number | number[];
  includeSourceLanguage?: boolean;
  includePseudoLanguage?: boolean;
  multilingual?: boolean;
  keepArchive?: boolean;
  dryrun?: boolean;
}

// Java message.bundle.list: id, format, export pattern, name. Shared by list and the add/clone
// echoes; Java's plain echo prints the id alone, but keeping the listing shape retains the name.
const bundleView: View<BundleView> = {
  text: (bundle) =>
    `${colors.yellow(`#${bundle.id}`)} ${colors.green(bundle.format ?? '')} ${colors.red(
      bundle.exportPattern ?? '',
    )} ${bundle.name ?? ''}`,
  plain: (bundle) => `${bundle.id} ${bundle.name ?? ''}`,
  keys: ['id', 'format', 'exportPattern', 'name'],
};

// The kept archive is a file the command wrote, so it belongs in the result: plain prints the bare
// path (what Java's --plain branch meant to print), json/toon serialize it, text keeps the sentence.
const archiveView: View<string> = {
  text: (archivePath) => `Archive saved to '${archivePath}'`,
  plain: (archivePath) => archivePath,
};

export default class BundleCommand {
  constructor(
    private getOutput: GetOutput,
    private getBundleService: GetBundleService,
    private getConfig: GetConfig,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'bundle',
      description: 'Manage bundles',
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
            sourcePatternOption,
            ignorePatternOption,
            exportPatternOption,
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
          description: 'Delete bundle',
          arguments: [
            {
              name: 'id',
              description: 'Id of the bundle to delete',
            },
          ],
          options: [projectConfigGroup],
          action: this.deleteAction,
        },
        {
          name: 'download',
          description: 'Download bundle',
          arguments: [
            {
              name: 'id',
              description: 'Numeric ID of the bundle',
            },
          ],
          options: [keepArchive, dryRun, projectConfigGroup],
          action: this.downloadAction,
        },
        {
          name: 'clone',
          description: 'Clone bundle',
          arguments: [
            {
              name: 'id',
              description: 'Id of the bundle to clone',
            },
          ],
          options: [
            nameOption,
            formatOption,
            sourcePatternOption,
            ignorePatternOption,
            exportPatternOption,
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
          description: 'Open bundle in the web browser',
          arguments: [
            {
              name: 'id',
              description: 'Bundle id',
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

    output.list(bundles, bundleView, { empty: 'No bundles found' });
  };

  addAction = async (command: Command) => {
    const [name] = command.args;
    const options = command.opts() as BundleOptions;
    const sourcePatterns = toArray(options.sourcePattern);

    if (!name) {
      throw new CliError("Bundle name can't be empty");
    }

    if (!options.format) {
      throw new CliError("'--format' can't be empty");
    }

    if (sourcePatterns.length === 0) {
      throw new CliError("'--source-pattern' can't be empty");
    }

    if (!options.exportPattern) {
      throw new CliError("'--export-pattern' can't be empty");
    }

    const output = this.getOutput(command);
    const bundleService = await this.getBundleService(command);
    const ignorePatterns = toArray(options.ignorePattern);
    const labelIds = toNumberArray(options.label, "'--label' value must be numeric");
    const payload: AddBundlePayload = {
      name,
      format: options.format,
      sourcePatterns,
      ...(ignorePatterns.length > 0 ? { ignorePatterns } : {}),
      exportPattern: options.exportPattern,
      ...(labelIds.length > 0 ? { labelIds } : {}),
      includeProjectSourceLanguage: options.includeSourceLanguage ?? false,
      includeInContextPseudoLanguage: options.includePseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? false,
    };
    const created = await bundleService.add(payload);

    output.item(created, bundleView);
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
      // An early exit still owes the machine formats a document: 'bailed' is carried by the exit
      // code and the stderr diagnostic, not by an absent stdout, which reads as an empty result.
      output.list([], pathView);
      return;
    }

    // Trigger the export and wait for the server to finish (the service owns the poll).
    output.spinner('bundle-build', 'start', 'Building bundle');

    let exportId: string;

    try {
      exportId = await bundleService.exportBundle(id, (progress) =>
        output.spinner('bundle-build', 'message', `Building bundle: ${progress}%`),
      );

      output.spinner('bundle-build', 'stop', 'Building bundle: 100%');
    } catch (error) {
      output.spinner('bundle-build', 'error', 'Build has failed');
      throw error;
    }

    // Archive and extracted files both land under basePath (matches `download` keep-archive behaviour).
    const archivePath = path.join(config.basePath, `bundle-${exportId}.zip`);
    const downloadUrl = await bundleService.getDownloadUrl(id, exportId);

    await downloadToFile(downloadUrl, archivePath);
    output.success(`#${bundle.id} '${bundle.name}' has been successfully downloaded`);

    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

    // Unlike `download`, which only ever uses archive entry names as lookup keys, this writes them
    // to disk. AdmZip's getData()/Bun.write pair does no containment checking of its own — Java gets
    // that from zip4j — so an entry named `../…` would land outside basePath. Checked before the
    // dry-run branch too, so a dry run reports the same bad archive instead of looking clean.
    const extractions = entries.map((entry) => {
      const relativePath = stripLeadingSlashes(toPosixPath(entry.entryName));
      const targetPath = path.join(config.basePath, relativePath);
      const relativeToBase = path.relative(config.basePath, targetPath);

      if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
        throw new CliError(`Archive entry '${entry.entryName}' would be extracted outside the base path`);
      }

      return { entry, relativePath, targetPath };
    });

    if (!options.dryrun) {
      for (const { entry, targetPath } of extractions) {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await Bun.write(targetPath, entry.getData());
      }
    }

    // Java prints one path per extracted file (message.file_path), for a dry run as much as for a
    // real one. Both used to go through log()/success(), so json/toon/plain — where the path list
    // is the whole result — printed nothing at all.
    const extractedPaths = extractions.map(({ relativePath }) => relativePath);

    if (isMachineFormat(options.output)) {
      output.list(extractedPaths, pathView);
    } else {
      for (const relativePath of extractedPaths) {
        output.success(relativePath);
      }
    }

    if (options.keepArchive) {
      // log() is text-only, so the plain branch this replaces printed nothing at all, and json/toon
      // lost the path with it. item() renders the view in every format — and those formats report
      // POSIX paths on every OS, so path.join's separators are normalized.
      output.item(toPosixPath(archivePath), archiveView);
    } else {
      try {
        await rm(archivePath, { force: true });
      } catch {
        output.warning(`Failed to delete archive '${archivePath}'`);
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

    const sourcePatterns = toArray(options.sourcePattern);
    const ignorePatterns = toArray(options.ignorePattern);
    const labelIds = toNumberArray(options.label, "'--label' value must be numeric");
    const payload: AddBundlePayload = {
      name: options.name ?? `${source.name ?? ''} (clone)`,
      format: options.format ?? source.format ?? '',
      sourcePatterns: sourcePatterns.length > 0 ? sourcePatterns : (source.sourcePatterns ?? []),
      ...(ignorePatterns.length > 0
        ? { ignorePatterns }
        : source.ignorePatterns !== undefined
          ? { ignorePatterns: source.ignorePatterns }
          : {}),
      exportPattern: options.exportPattern ?? source.exportPattern ?? '',
      ...(labelIds.length > 0 ? { labelIds } : source.labelIds !== undefined ? { labelIds: source.labelIds } : {}),
      includeProjectSourceLanguage: options.includeSourceLanguage ?? source.includeProjectSourceLanguage ?? false,
      includeInContextPseudoLanguage: options.includePseudoLanguage ?? source.includeInContextPseudoLanguage ?? true,
      isMultilingual: options.multilingual ?? source.isMultilingual ?? false,
    };
    const cloned = await bundleService.add(payload);

    output.item(cloned, bundleView);
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
}
