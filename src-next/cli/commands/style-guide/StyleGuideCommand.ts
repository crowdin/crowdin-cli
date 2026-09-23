import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { assigned as assignedOption, baseConfigGroup } from '@/cli/commands/common/options.ts';
import { downloadedPathView } from '@/cli/commands/common/views.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetConfig, GetOutput, GetStorageService, GetStyleGuideService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { downloadToFile } from '@/cli/utils/downloadToFile.ts';
import { parseNumericId, toArray, toNumberArray } from '@/cli/utils/parsing.ts';
import { assertProjectConfigured } from '@/lib/config.ts';
import {
  id as idOption,
  language as languageOption,
  name as nameOption,
  project as projectOption,
  shared as sharedOption,
  to as toOption,
} from './options.ts';
import { createStyleGuideView } from './views.ts';

interface ListOptions extends GlobalOptions {
  assigned?: boolean;
}

interface DownloadOptions extends GlobalOptions {
  to?: string;
}

interface UploadOptions extends GlobalOptions {
  id?: string;
  name?: string;
  project?: string | string[];
  language?: string | string[];
  shared?: boolean;
}

const UPLOAD_EXTENSIONS = ['md', 'pdf', 'docx', 'xlsx'];
const DEFAULT_EXTENSION = 'md';

export default class StyleGuideCommand {
  constructor(
    private getOutput: GetOutput,
    private getStyleGuideService: GetStyleGuideService,
    private getStorageService: GetStorageService,
    private getConfig: GetConfig,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'style-guide',
      description: 'Manage style guides',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of style guides',
          options: [assignedOption, baseConfigGroup],
          action: this.listAction,
        },
        {
          name: 'download',
          description: 'Download style guide',
          arguments: [
            {
              name: 'id',
              description: 'Style guide identifier',
            },
          ],
          options: [toOption, baseConfigGroup],
          action: this.downloadAction,
        },
        {
          name: 'upload',
          description: 'Upload a file to create a style guide or replace the file of an existing one',
          arguments: [
            {
              name: 'file',
              description: 'File to upload',
            },
          ],
          options: [idOption, nameOption, projectOption, languageOption, sharedOption, baseConfigGroup],
          action: this.uploadAction,
        },
        {
          name: 'delete',
          description: 'Delete style guide',
          arguments: [
            {
              name: 'id',
              description: 'Style guide identifier',
            },
          ],
          options: [baseConfigGroup],
          action: this.deleteAction,
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
    const styleGuideService = await this.getStyleGuideService(command);
    const guides = await styleGuideService.list(await this.assignedProjectId(command, options));

    output.list(guides, createStyleGuideView({ verbose: options.verbose }), {
      empty: options.assigned ? 'No style guides assigned to the project' : 'No style guides found',
    });
  };

  // Only --assigned needs a project: every other style-guide subcommand works account-wide, so the
  // config is read here instead of the service factory.
  private async assignedProjectId(command: Command, options: ListOptions): Promise<number | undefined> {
    if (!options.assigned) {
      return undefined;
    }

    const config = await this.getConfig(command);

    assertProjectConfigured(config);

    return config.projectId;
  }

  downloadAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Style guide');
    const options = command.optsWithGlobals() as DownloadOptions;
    const output = this.getOutput(command);
    const styleGuideService = await this.getStyleGuideService(command);
    const guide = await styleGuideService.get(id);
    const to = options.to ?? `${guide.name}.${this.extensionFromDownloadLink(guide.downloadLink)}`;

    try {
      await downloadToFile(guide.downloadLink, to);
    } catch (error) {
      throw toCliError(error, `Failed to write to the file '${to}'`);
    }

    output.item(to, downloadedPathView);
  };

  // The signed download URL ends in a storage key with no extension; the original file name travels
  // in its `response-content-disposition` parameter instead.
  private extensionFromDownloadLink(downloadLink: string): string {
    const disposition = new URL(downloadLink).searchParams.get('response-content-disposition') ?? '';
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? '';

    return path.extname(fileName).replace(/^\./, '').toLowerCase() || DEFAULT_EXTENSION;
  }

  uploadAction = async (command: Command) => {
    const [fileArg] = command.args as [string];
    const options = command.optsWithGlobals() as UploadOptions;
    const id = options.id === undefined ? undefined : parseNumericId(options.id, 'Style guide');
    const projectIds = toNumberArray(options.project, 'Invalid project id');
    const languageIds = toArray(options.language);

    if (id !== undefined) {
      const conflicting = [
        options.name !== undefined && '--name',
        projectIds.length > 0 && '--project',
        languageIds.length > 0 && '--language',
        options.shared !== undefined && '--shared',
      ].filter(Boolean);

      if (conflicting.length > 0) {
        throw new ValidationError(`'${conflicting.join("', '")}' can't be used with '--id'`);
      }
    }

    if (options.shared && projectIds.length > 0) {
      throw new ValidationError("'--shared' can't be used with '--project'");
    }

    const fileStat = await stat(fileArg).catch(() => undefined);

    if (fileStat === undefined) {
      throw new CliError(`File '${fileArg}' not found`);
    }

    if (fileStat.isDirectory()) {
      throw new CliError('The specified file is a directory');
    }

    if (!UPLOAD_EXTENSIONS.includes(path.extname(fileArg).replace(/^\./, '').toLowerCase())) {
      throw new CliError(`Supported formats: ${UPLOAD_EXTENSIONS.join(', ')}`);
    }

    const output = this.getOutput(command);
    const styleGuideService = await this.getStyleGuideService(command);
    const storageService = await this.getStorageService(command);
    const storage = await storageService.addStorage(Bun.file(fileArg));

    const guide =
      id !== undefined
        ? await styleGuideService.replaceFile(id, storage.data.id)
        : await styleGuideService.add({
            name: options.name ?? path.parse(fileArg).name,
            storageId: storage.data.id,
            ...(projectIds.length > 0 ? { projectIds } : {}),
            ...(languageIds.length > 0 ? { languageIds } : {}),
            ...(options.shared !== undefined ? { isShared: options.shared } : {}),
          });

    output.success(`${id !== undefined ? 'Updated' : 'Created'} #${guide.id} '${guide.name}' style guide`);
    output.item(await styleGuideService.get(guide.id), createStyleGuideView(), { mark: false });
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Style guide');
    const output = this.getOutput(command);
    const styleGuideService = await this.getStyleGuideService(command);

    await styleGuideService.delete(id);

    output.success(`Style guide #${id} deleted successfully`);
  };
}
