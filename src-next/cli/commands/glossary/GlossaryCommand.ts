import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { GlossariesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { baseConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GlossaryService } from '@/cli/services/GlossaryService.ts';
import type { GetApiClient, GetGlossaryService, GetOutput, GetStorageService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { parseNumericId, parseScheme, toArray } from '@/cli/utils/parsing.ts';
import {
  firstLineContainsHeader as firstLineContainsHeaderOption,
  format as formatOption,
  GLOSSARY_FORMATS,
  id as idOption,
  language as languageOption,
  scheme as schemeOption,
  to as toOption,
} from './options.ts';
import { createGlossaryView } from './views.ts';

interface DownloadOptions extends GlobalOptions {
  format?: GlossariesModel.GlossaryFormat;
  to?: string;
}

interface UploadOptions extends GlobalOptions {
  id?: string;
  language?: string;
  scheme?: string | string[];
  firstLineContainsHeader?: boolean;
}

const UPLOAD_EXTENSIONS = ['tbx', 'csv', 'xls', 'xlsx'];
const SCHEME_EXTENSIONS = ['csv', 'xls', 'xlsx'];
const DEFAULT_GLOSSARY_NAME = 'Created in Crowdin CLI (%s)';

export default class GlossaryCommand {
  constructor(
    private getOutput: GetOutput,
    private getGlossaryService: GetGlossaryService,
    private getStorageService: GetStorageService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'glossary',
      description: 'Manage glossaries',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of glossaries',
          options: [baseConfigGroup],
          action: this.listAction,
        },
        {
          name: 'download',
          description: 'Download glossary',
          arguments: [
            {
              name: 'id',
              description: 'Glossary identifier',
            },
          ],
          options: [formatOption, toOption, baseConfigGroup],
          action: this.downloadAction,
        },
        {
          name: 'upload',
          description: 'Upload glossary to localization resources',
          arguments: [
            {
              name: 'file',
              description: 'File to upload',
            },
          ],
          options: [idOption, languageOption, schemeOption, firstLineContainsHeaderOption, baseConfigGroup],
          action: this.uploadAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as GlobalOptions;
    const output = this.getOutput(command);
    const glossaryService = await this.getGlossaryService(command);
    const glossaries = await glossaryService.list();

    // Terms cost a request per glossary and only the verbose text render shows them — plain prints
    // the name alone and json/toon carry the glossaries themselves.
    const withTerms = options.verbose && (options.output ?? 'text') === 'text';
    const view = withTerms
      ? createGlossaryView({ verbose: true, terms: await this.loadTerms(output, glossaryService, glossaries) })
      : createGlossaryView();

    output.list(glossaries, view, { empty: 'No glossaries found' });
  };

  downloadAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Glossary');
    const options = command.optsWithGlobals() as DownloadOptions;
    let format = options.format;

    if (options.to !== undefined && format === undefined) {
      const extension = path.extname(options.to).replace(/^\./, '').toLowerCase();

      if (!GLOSSARY_FORMATS.includes(extension as GlossariesModel.GlossaryFormat)) {
        throw new CliError('Supported formats: tbx, csv, xlsx');
      }

      format = extension as GlossariesModel.GlossaryFormat;
    }

    const output = this.getOutput(command);
    const glossaryService = await this.getGlossaryService(command);
    const glossary = await glossaryService.get(id);
    const to = options.to ?? `${glossary.name}.${format ?? 'tbx'}`;

    const exportId = await glossaryService.export(glossary.id, format);
    const downloadUrl = await glossaryService.getDownloadUrl(glossary.id, exportId);
    const response = await fetch(downloadUrl);

    try {
      await Bun.write(to, response);
    } catch (error) {
      throw toCliError(error, `Failed to write to the file '${to}'`);
    }

    output.success(`'${to}' downloaded successfully`);
  };

  uploadAction = async (command: Command) => {
    const [fileArg] = command.args as [string];
    const options = command.optsWithGlobals() as UploadOptions;
    const extension = path.extname(fileArg).replace(/^\./, '').toLowerCase();
    const id = options.id === undefined ? undefined : parseNumericId(options.id, 'Glossary');
    const scheme = parseScheme(toArray(options.scheme));
    const fileStat = await stat(fileArg).catch(() => undefined);

    if (fileStat === undefined) {
      // Same wording as the Java CLI (error.file_not_found)
      throw new CliError(`File '${fileArg}' not found in the Crowdin project`);
    }

    if (fileStat.isDirectory()) {
      throw new CliError('The specified file is a directory');
    }

    if (!UPLOAD_EXTENSIONS.includes(extension)) {
      throw new CliError('Supported formats: tbx, csv, xlsx');
    }

    if (!SCHEME_EXTENSIONS.includes(extension) && scheme !== undefined) {
      throw new CliError('Scheme is used only for CSV or XLS/XLSX files');
    }

    if (SCHEME_EXTENSIONS.includes(extension) && scheme === undefined) {
      throw new CliError('Scheme is required for CSV or XLS/XLSX files');
    }

    if (!SCHEME_EXTENSIONS.includes(extension) && options.firstLineContainsHeader !== undefined) {
      throw new CliError("'--first-line-contains-header' is used only for CSV or XLS/XLSX files");
    }

    if (id === undefined && options.language === undefined) {
      throw new CliError("'--language' is required for creating new glossary");
    }

    const output = this.getOutput(command);
    const glossaryService = await this.getGlossaryService(command);
    const storageService = await this.getStorageService(command);
    const apiClient = await this.getApiClient(command);
    const isEnterprise = Boolean(apiClient.organization);

    const glossary =
      id !== undefined
        ? await glossaryService.get(id)
        : await glossaryService.add({
            name: DEFAULT_GLOSSARY_NAME.replace('%s', path.basename(fileArg)),
            languageId: options.language as string,
            ...(isEnterprise ? { groupId: 0 } : {}),
          });

    const storage = await storageService.addStorage(Bun.file(fileArg));

    await glossaryService.import(glossary.id, {
      storageId: storage.data.id,
      ...(scheme !== undefined ? { scheme } : {}),
      ...(options.firstLineContainsHeader !== undefined
        ? { firstLineContainsHeader: options.firstLineContainsHeader }
        : {}),
    });

    output.success(`Imported in #${glossary.id} '${glossary.name}' glossary`);
  };

  private async loadTerms(
    output: ReturnType<GetOutput>,
    glossaryService: GlossaryService,
    glossaries: GlossariesModel.Glossary[],
  ): Promise<Map<number, GlossariesModel.Term[]>> {
    const byGlossary = new Map<number, GlossariesModel.Term[]>();

    for (const glossary of glossaries) {
      if (glossary.terms === 0) {
        continue;
      }

      const terms = await glossaryService.listTerms(glossary.id).catch(() => undefined);

      if (terms === undefined) {
        output.warning('You do not have permission to manage this glossary');
        continue;
      }

      byGlossary.set(glossary.id, terms);
    }

    return byGlossary;
  }
}
