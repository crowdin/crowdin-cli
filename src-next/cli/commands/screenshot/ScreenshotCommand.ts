import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { ScreenshotsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ScreenshotService, ScreenshotView } from '@/cli/services/ScreenshotService.ts';
import type { GetOutput, GetProjectService, GetScreenshotService, GetStorageService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';

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
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
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

    output.table(screenshots.map((entry) => this.toRow(entry)));
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadOptions;
    const [filePath] = command.args;
    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);

    if (!filePath) {
      throw new CliError('Screenshot file path can not be empty');
    }

    await this.validateFile(filePath);
    this.validateUploadOptions(options);

    const image = Bun.file(filePath);
    const imageName = path.basename(filePath);
    const branch = await projectService.branch.getBranch(options.branch);

    if (options.branch && !branch) {
      throw new CliError(`Project doesn't contain the '${options.branch}' branch`);
    }

    const branchId = branch?.id;
    const filesResponse = await projectService.loadProjectFiles(branchId);
    const directories = await projectService.directory.loadProjectDirectories(branchId);
    const fileId = options.file ? this.resolveFileId(options.file, filesResponse.data) : undefined;
    const directoryId = options.directory ? this.resolveDirectoryId(options.directory, directories) : undefined;
    const labelIds = await projectService.label.resolveLabelIds(this.toArray(options.label));
    const existingScreenshot = await screenshotService.findByName(imageName);
    const storage = await storageService.addStorage(image);

    if (existingScreenshot) {
      await this.updateScreenshot(
        screenshotService,
        existingScreenshot.id,
        imageName,
        storage.data.id,
        options.autoTag ?? false,
        branchId,
        fileId,
        directoryId,
      );

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
    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const id = this.parseNumericId(idArg);
    const screenshot = await screenshotService.get(id);

    if (!screenshot) {
      output.warning("Couldn't find screenshot by the specified ID");
      return;
    }

    await screenshotService.delete(id);
    output.success(`Screenshot '#${id} ${screenshot.name}' deleted successfully`);
  };

  private validateUploadOptions(options: UploadOptions): void {
    if (options.file && !options.autoTag) {
      throw new CliError("'--auto-tag' is required for '--file' option");
    }

    if (options.branch && !options.autoTag) {
      throw new CliError("'--auto-tag' is required for '--branch' option");
    }

    if (options.directory && !options.autoTag) {
      throw new CliError("'--auto-tag' is required for '--directory' option");
    }

    const selectedTargetingOptions = [options.file, options.branch, options.directory].filter(Boolean);

    if (selectedTargetingOptions.length > 1) {
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
    const allowed = new Set(['jpeg', 'jpg', 'png', 'gif']);

    if (!allowed.has(extension)) {
      throw new CliError('Wrong format of the file. Supported formats: jpeg, jpg, png, gif');
    }
  }

  private async updateScreenshot(
    screenshotService: ScreenshotService,
    screenshotId: number,
    imageName: string,
    storageId: number,
    autoTag: boolean,
    branchId?: number,
    fileId?: number,
    directoryId?: number,
  ): Promise<void> {
    const request: ScreenshotsModel.UpdateScreenshotRequest = { name: imageName, storageId };

    await screenshotService.update(screenshotId, request);

    if (autoTag) {
      const autoTagRequest: ScreenshotsModel.AutoTagRequest = {
        autoTag: true,
        ...(branchId !== undefined ? { branchId } : {}),
        ...(fileId !== undefined ? { fileId } : {}),
        ...(directoryId !== undefined ? { directoryId } : {}),
      };

      await screenshotService.replaceTags(screenshotId, autoTagRequest);
    }
  }

  private resolveFileId(filePath: string, files: Array<{ data: { path: string; id: number } }>): number {
    const normalizedFilePath = this.normalizePath(filePath);
    const file = files.find((entry) => this.normalizePath(entry.data.path) === normalizedFilePath);

    if (!file) {
      throw new CliError(`Project doesn't contain the '${filePath}' file`);
    }

    return file.data.id;
  }

  private resolveDirectoryId(
    directoryPath: string,
    directories: Array<{ data: { path: string; id: number } }>,
  ): number {
    const normalizedDirectoryPath = this.normalizePath(directoryPath);
    const directory = directories.find((entry) => this.normalizePath(entry.data.path) === normalizedDirectoryPath);

    if (!directory) {
      throw new CliError(`Project doesn't contain the '${directoryPath}' directory`);
    }

    return directory.data.id;
  }

  private normalizePath(value: string): string {
    const normalizedValue = value.replaceAll('\\', '/').replace(/^\/+/, '');

    return `/${normalizedValue}`;
  }

  private parseNumericId(idArg: string | undefined): number {
    if (!idArg) {
      throw new CliError('Screenshot id can not be empty');
    }

    const id = Number(idArg);

    if (Number.isNaN(id)) {
      throw new CliError('Screenshot id must be numeric');
    }

    return id;
  }

  private toArray(value?: string | string[]): string[] {
    if (value === undefined || value === '') {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private toRow(screenshot: ScreenshotView): Record<string, unknown> {
    return {
      id: screenshot.id,
      tagsCount: screenshot.tagsCount,
      name: screenshot.name,
    };
  }
}
