import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { TranslationMemoryModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetApiClient, GetOutput, GetStorageService, GetTmService } from '@/cli/services.ts';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import { parseNumericId, toArray } from '@/cli/utils/parsing.ts';

const TM_FORMATS: TranslationMemoryModel.Format[] = ['tmx', 'csv', 'xlsx'];
const UPLOAD_EXTENSIONS = ['tmx', 'csv', 'xls', 'xlsx'];
const SCHEME_EXTENSIONS = ['csv', 'xls', 'xlsx'];
const DEFAULT_TM_NAME = 'Created in Crowdin CLI (%s)';

// Java '--plain' is covered by the global '--format' option.
// Java 'tm download --format' is renamed to '--file-format' because it would
// clash with the global '--format' (output mode) option.

const fileFormatOption: OptionDef = {
  name: 'file-format',
  type: 'string',
  description: 'Format of the file. Supported formats: tmx, csv, xlsx',
  choices: [...TM_FORMATS],
};

const sourceLanguageIdOption: OptionDef = {
  name: 'source-language-id',
  type: 'string',
  description: 'Defines source language in the language pair',
};

const targetLanguageIdOption: OptionDef = {
  name: 'target-language-id',
  type: 'string',
  description: 'Defines target language in the language pair',
};

const toOption: OptionDef = {
  name: 'to',
  type: 'string',
  description: 'Path where the translation memory should be downloaded',
};

const idOption: OptionDef = {
  name: 'id',
  type: 'string',
  description: 'Translation memory identifier for uploading to the existing TM',
};

const languageOption: OptionDef = {
  name: 'language',
  type: 'string',
  description: 'Translation Memory language identifier',
};

const schemeOption: OptionDef = {
  name: 'scheme',
  type: 'string',
  variadic: true,
  description: 'Defines data columns scheme (required for CSV or XLS/XLSX files)',
};

const firstLineContainsHeaderOption: OptionDef = {
  name: 'first-line-contains-header',
  type: 'boolean',
  description:
    "Defines whether the file contains the first-row header that shouldn't be imported (used only for CSV or XLS/XLSX files)",
};

interface DownloadOptions extends GlobalOptions {
  sourceLanguageId?: string;
  targetLanguageId?: string;
  fileFormat?: TranslationMemoryModel.Format;
  to?: string;
}

interface UploadOptions extends GlobalOptions {
  id?: string;
  language?: string;
  scheme?: string | string[];
  firstLineContainsHeader?: boolean;
}

export default class TmCommand {
  constructor(
    private getOutput: GetOutput,
    private getTmService: GetTmService,
    private getStorageService: GetStorageService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'tm',
      description: 'Manage translation memories',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of translation memories',
          action: this.listAction,
        },
        {
          name: 'download',
          description: 'Download translation memory',
          arguments: [
            {
              name: 'id',
              description: 'Translation memory identifier',
            },
          ],
          options: [sourceLanguageIdOption, targetLanguageIdOption, fileFormatOption, toOption],
          action: this.downloadAction,
        },
        {
          name: 'upload',
          description: 'Upload translation memory to localization resources',
          arguments: [
            {
              name: 'file',
              description: 'File to upload',
            },
          ],
          options: [idOption, languageOption, schemeOption, firstLineContainsHeaderOption],
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
    const output = this.getOutput(command);
    const tmService = await this.getTmService(command);
    const tms = await tmService.list();

    if (tms.length === 0) {
      output.success('No translation memories found');
      return;
    }

    output.table(
      tms.map((tm) => ({
        id: tm.id,
        name: tm.name,
        segments: tm.segmentsCount,
      })),
    );
  };

  downloadAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Translation memory');
    const options = command.optsWithGlobals() as DownloadOptions;
    let format = options.fileFormat;

    if (options.to !== undefined && format === undefined) {
      const extension = path.extname(options.to).replace(/^\./, '').toLowerCase();

      if (!TM_FORMATS.includes(extension as TranslationMemoryModel.Format)) {
        throw new CliError('Supported formats: tmx, csv, xlsx');
      }

      format = extension as TranslationMemoryModel.Format;
    }

    if (options.sourceLanguageId !== undefined && options.targetLanguageId === undefined) {
      throw new CliError("'--target-language-id' must be specified along with '--source-language-id'");
    }

    if (options.sourceLanguageId === undefined && options.targetLanguageId !== undefined) {
      throw new CliError("'--source-language-id' must be specified along with '--target-language-id'");
    }

    const output = this.getOutput(command);
    const tmService = await this.getTmService(command);
    const tm = await tmService.get(id);
    const to = options.to ?? `${tm.name}.${format ?? 'tmx'}`;

    const exportId = await tmService.export(tm.id, options.sourceLanguageId, options.targetLanguageId, format);
    const downloadUrl = await tmService.getDownloadUrl(tm.id, exportId);
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
    const id = options.id === undefined ? undefined : parseNumericId(options.id, 'Translation memory');
    const scheme = this.parseScheme(toArray(options.scheme));
    const fileStat = await stat(fileArg).catch(() => undefined);

    if (fileStat === undefined) {
      // Same wording as the Java CLI (error.file_not_found)
      throw new CliError(`File '${fileArg}' not found in the Crowdin project`);
    }

    if (fileStat.isDirectory()) {
      throw new CliError('The specified file is a directory');
    }

    // The Java CLI checks 'csv' and 'xslx' (a typo of 'xlsx') here; the intent
    // per the error message is CSV or XLS/XLSX files
    if (scheme === undefined && SCHEME_EXTENSIONS.includes(extension)) {
      throw new CliError('Scheme is required for CSV or XLS/XLSX files');
    }

    if (!UPLOAD_EXTENSIONS.includes(extension)) {
      throw new CliError('Supported formats: tmx, csv, xlsx');
    }

    if (!SCHEME_EXTENSIONS.includes(extension) && options.firstLineContainsHeader !== undefined) {
      throw new CliError("'--first-line-contains-header' is used only for CSV or XLS/XLSX files");
    }

    if (id === undefined && options.language === undefined) {
      throw new CliError("'--language' is required for creating new translation memory");
    }

    const output = this.getOutput(command);
    const tmService = await this.getTmService(command);
    const storageService = await this.getStorageService(command);
    const apiClient = await this.getApiClient(command);
    const isEnterprise = Boolean(apiClient.organization);

    const tm =
      id !== undefined
        ? await tmService.get(id)
        : await tmService.add({
            name: DEFAULT_TM_NAME.replace('%s', path.basename(fileArg)),
            languageId: options.language as string,
            ...(isEnterprise ? { groupId: 0 } : {}),
          });

    const storage = await storageService.addStorage(Bun.file(fileArg));

    await tmService.import(tm.id, {
      storageId: storage.data.id,
      ...(scheme !== undefined ? { scheme } : {}),
      ...(options.firstLineContainsHeader !== undefined
        ? { firstLineContainsHeader: options.firstLineContainsHeader }
        : {}),
    });

    output.success(`Imported in #${tm.id} '${tm.name}' translation memory`);
  };

  private parseScheme(values: string[]): TranslationMemoryModel.Scheme | undefined {
    if (values.length === 0) {
      return undefined;
    }

    const scheme: TranslationMemoryModel.Scheme = {};

    for (const value of values.flatMap((entry) => entry.split(','))) {
      const [key, column, ...rest] = value.split('=');
      const index = Number(column);

      if (!key || column === undefined || rest.length > 0 || !Number.isInteger(index) || index < 0) {
        throw new CliError(
          `The '--scheme' parameter has an invalid value '${value}'. Expected format: <column>=<index> (e.g. en=0)`,
        );
      }

      scheme[key] = index;
    }

    return scheme;
  }
}
