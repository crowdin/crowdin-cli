import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { ScreenshotsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ScreenshotView } from '@/cli/services/ScreenshotService.ts';
import type {
  GetBranchService,
  GetDirectoryService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetScreenshotService,
  GetStorageService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { parseNumericId, toArray } from '@/cli/utils/parsing.ts';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpeg', 'jpg', 'png', 'gif']);

interface ListOptions extends GlobalOptions {
  stringId?: number;
}

interface UploadOptions extends GlobalOptions {
  autoTag?: boolean;
  file?: string;
  branch?: string;
  label?: string[];
  directory?: string;
}

export default class ScreenshotCommand {
  constructor(
    private getOutput: GetOutput,
    private getScreenshotService: GetScreenshotService,
    private getStorageService: GetStorageService,
    private getBranchService: GetBranchService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'screenshot',
      description: 'Manage screenshots',
      subcommands: [
        {
          name: 'list',
          description: 'List screenshots',
          options: [
            {
              name: 'string-id',
              type: 'number',
              description: 'Numeric string identifier',
            },
          ],
          action: this.listAction,
        },
        {
          name: 'upload',
          description: 'Add screenshot',
          arguments: [
            {
              name: 'file',
              description: 'File path to add',
            },
          ],
          options: [
            {
              name: 'auto-tag',
              type: 'boolean',
              description: 'Choose whether or not to tag screenshot automatically',
            },
            {
              name: 'file',
              short: 'f',
              type: 'string',
              description: "Path to the source file in Crowdin. Requires the '--auto-tag' to be passed",
            },
            {
              name: 'branch',
              short: 'b',
              type: 'string',
              description: "Branch name. Requires the '--auto-tag' to be passed",
            },
            {
              name: 'label',
              type: 'string',
              variadic: true,
              description: 'Attach labels to screenshot (multiple labels can be specified)',
            },
            {
              name: 'directory',
              short: 'd',
              type: 'string',
              description: "Path to the directory in Crowdin. Requires the '--auto-tag' to be passed",
            },
          ],
          action: this.uploadAction,
        },
        {
          name: 'delete',
          description: 'Delete screenshot',
          arguments: [
            {
              name: 'id',
              description: 'Screenshot id',
            },
          ],
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
    const screenshotService = await this.getScreenshotService(command);
    const screenshots = await screenshotService.list(options.stringId);

    if (screenshots.length === 0) {
      output.success('No screenshot found');
      return;
    }

    output.table(screenshots.map(this.toRow));
  };

  uploadAction = async (command: Command) => {
    const [filePath] = command.args;
    const options = command.optsWithGlobals() as UploadOptions;

    if (!filePath) {
      throw new CliError('Screenshot file path can not be empty');
    }

    this.validateUploadOptions(options);
    await this.validateFile(filePath);

    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const storageService = await this.getStorageService(command);
    const branchService = await this.getBranchService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const image = Bun.file(filePath);
    const imageName = path.basename(filePath);
    const branch = await branchService.getBranch(options.branch);

    if (options.branch && !branch) {
      throw new CliError(`Project doesn't contain the '${options.branch}' branch`);
    }

    const branchId = branch?.id;
    const fileId = options.file
      ? await fileService.resolveFileIds([options.file], branchId).then(this.takeFirstFileId(options.file))
      : undefined;
    const directoryId = await directoryService.resolveDirectoryId(options.directory, branchId);
    const labelIds = await labelService.resolveLabelIds(toArray(options.label));
    const existingScreenshot = await screenshotService.findByName(imageName);
    const storage = await storageService.addStorage(image);

    if (existingScreenshot) {
      await screenshotService.update(existingScreenshot.id, { name: imageName, storageId: storage.data.id });

      if (options.autoTag) {
        await screenshotService.replaceTags(existingScreenshot.id, {
          autoTag: true,
          ...(branchId !== undefined ? { branchId } : {}),
          ...(fileId !== undefined ? { fileId } : {}),
          ...(directoryId !== undefined ? { directoryId } : {}),
        });
      }

      const updatedScreenshot = await screenshotService.get(existingScreenshot.id);

      if (updatedScreenshot) {
        output.table([this.toRow(updatedScreenshot)]);
      }

      return;
    }

    const request: ScreenshotsModel.CreateScreenshotRequest = {
      name: imageName,
      storageId: storage.data.id,
      autoTag: options.autoTag ?? false,
      ...(branchId !== undefined ? { branchId } : {}),
      ...(fileId !== undefined ? { fileId } : {}),
      ...(directoryId !== undefined ? { directoryId } : {}),
      ...(labelIds !== undefined ? { labelIds } : {}),
    };

    try {
      const screenshot = await screenshotService.upload(request);
      output.table([this.toRow(screenshot)]);
    } catch (error) {
      if (screenshotService.isAutoTagInProgressError(error)) {
        output.warning(`Tags were not applied for ${imageName} because auto tag is currently in progress`);
        return;
      }

      throw error;
    }
  };

  deleteAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Screenshot');
    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const screenshot = await screenshotService.get(id);

    if (!screenshot) {
      output.warning("Couldn't find screenshot by the specified ID");
      return;
    }

    await screenshotService.delete(id);

    output.success(`Screenshot '#${id} ${screenshot.name}' deleted successfully`);
  };

  private validateUploadOptions(options: UploadOptions): void {
    const targetingFlags: Array<[keyof UploadOptions, string]> = [
      ['file', '--file'],
      ['branch', '--branch'],
      ['directory', '--directory'],
    ];

    for (const [key, flag] of targetingFlags) {
      if (options[key] && !options.autoTag) {
        throw new CliError(`'--auto-tag' is required for '${flag}' option`);
      }
    }

    const selected = targetingFlags.filter(([key]) => Boolean(options[key]));

    if (selected.length > 1) {
      throw new CliError(
        "Only one of the following options can be used at a time: '--file', '--branch' or '--directory'",
      );
    }
  }

  private async validateFile(filePath: string): Promise<void> {
    let stats: Awaited<ReturnType<typeof stat>>;

    try {
      stats = await stat(filePath);
    } catch {
      throw new CliError(`File '${filePath}' not found in the Crowdin project`);
    }

    if (stats.isDirectory()) {
      throw new CliError('The specified file is a directory');
    }

    const extension = path.extname(filePath).slice(1).toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      throw new CliError('Wrong format of the file. Supported formats: jpeg, jpg, png, gif');
    }
  }

  private takeFirstFileId(originalPath: string) {
    return (resolved: { fileIds: number[]; missingPaths: string[] }): number => {
      const [fileId] = resolved.fileIds;

      if (fileId === undefined) {
        throw new CliError(`Project doesn't contain the '${originalPath}' file`);
      }

      return fileId;
    };
  }

  private toRow(screenshot: ScreenshotView): Record<string, unknown> {
    return {
      id: screenshot.id,
      tagsCount: screenshot.tagsCount,
      name: screenshot.name,
    };
  }
}
