import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { ScreenshotsModel } from '@crowdin/crowdin-api-client';
import { Glob } from 'bun';
import type { Command } from 'commander';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from '@/cli/commands/common/failures.ts';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
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
import { colors } from '@/cli/utils/colors.ts';
import { isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { View } from '@/cli/utils/output.ts';
import { parseNumericId, toArray, toNumberArray } from '@/cli/utils/parsing.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import {
  autoTag,
  branch as branchOption,
  directory,
  excludeLabel,
  file,
  filterLabel,
  label,
  search,
  stringId,
} from './options.ts';

interface ListOptions extends GlobalOptions {
  stringId?: string | string[];
  search?: string;
  label?: string[];
  excludeLabel?: string[];
}

interface UploadOptions extends GlobalOptions {
  autoTag?: boolean;
  file?: string;
  branch?: string;
  label?: string[];
  directory?: string;
}

interface UploadTarget {
  autoTag: boolean;
  branchId?: number;
  fileId?: number;
  directoryId?: number;
  labelIds?: number[];
}

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpeg', 'jpg', 'png', 'gif']);
const SUPPORTED_FORMATS = [...ALLOWED_IMAGE_EXTENSIONS].join(', ');

// Shared by list and the upload/update echoes, so the plain echo keeps the id addressable.
const screenshotView: View<ScreenshotView> = {
  text: (screenshot) =>
    `${colors.yellow(`#${screenshot.id}`)} ${screenshot.tagsCount} ${colors.green(screenshot.name)}`,
  plain: (screenshot) => `${screenshot.id} ${screenshot.name}`,
  keys: ['id', 'tagsCount', 'name'],
};

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
          options: [stringId, search, filterLabel, excludeLabel, projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'upload',
          description: 'Add screenshot or update an existing one with the same name',
          arguments: [
            {
              name: 'path',
              description: 'File or directory to upload',
            },
          ],
          options: [autoTag, file, branchOption, label, directory, projectConfigGroup],
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
          options: [projectConfigGroup],
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
    const { labelIds, excludeLabelIds } = await this.resolveFilterLabelIds(command, options);
    const screenshots = await screenshotService.list({
      stringIds: toNumberArray(options.stringId, "The '--string-id' value must be numeric"),
      search: options.search,
      labelIds,
      excludeLabelIds,
    });

    output.list(screenshots, screenshotView, { empty: 'No screenshot found' });
  };

  private async resolveFilterLabelIds(command: Command, options: ListOptions) {
    const titles = toArray(options.label);
    const excludedTitles = toArray(options.excludeLabel);

    if (titles.length === 0 && excludedTitles.length === 0) {
      return {};
    }

    const labelService = await this.getLabelService(command);
    const idsByTitle = new Map((await labelService.list()).map((entry) => [entry.title, entry.id]));
    // filtering must not create labels, so unknown titles are an error instead of a silent no-op
    const toIds = (labelTitles: string[]) =>
      labelTitles.map((title) => {
        const labelId = idsByTitle.get(title);

        if (labelId === undefined) {
          throw new CliError(`Project doesn't contain the '${title}' label`);
        }

        return labelId;
      });

    return { labelIds: toIds(titles), excludeLabelIds: toIds(excludedTitles) };
  }

  uploadAction = async (command: Command) => {
    const [inputPath] = command.args;
    const options = command.optsWithGlobals() as UploadOptions;

    if (!inputPath) {
      throw new CliError('Screenshot path can not be empty');
    }

    this.validateUploadOptions(options);

    if (await this.isDirectory(inputPath)) {
      await this.uploadDirectory(await this.collectImagePaths(inputPath), options, command);
    } else {
      this.validateImageFormat(inputPath);
      await this.uploadFile(inputPath, options, command);
    }
  };

  private async uploadFile(imagePath: string, options: UploadOptions, command: Command): Promise<void> {
    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const target = await this.resolveUploadTarget(command, options);
    const existing = await screenshotService.findAllByName(path.basename(imagePath));
    const screenshot = await this.upsertScreenshot(imagePath, existing, target, command);

    if (screenshot) {
      output.item(screenshot, screenshotView);
    }
  }

  private async uploadDirectory(imagePaths: string[], options: UploadOptions, command: Command): Promise<void> {
    const output = this.getOutput(command);
    const screenshotService = await this.getScreenshotService(command);
    const target = await this.resolveUploadTarget(command, options);
    const existingByName = Map.groupBy(await screenshotService.list(), (screenshot) => screenshot.name);
    const uploaded: ScreenshotView[] = [];
    const tasks = imagePaths.map((imagePath) => async () => {
      try {
        const existing = (existingByName.get(path.basename(imagePath)) ?? []).sort((left, right) => left.id - right.id);
        const screenshot = await this.upsertScreenshot(imagePath, existing, target, command);

        if (!screenshot) {
          return;
        }

        uploaded.push(screenshot);

        // json/toon get one sorted list at the end; text and plain stream a line per screenshot
        if (!isStructuredFormat(options.output)) {
          output.item(screenshot, screenshotView);
        }
      } catch (error) {
        throw new CliError(`Screenshot '${imagePath}': ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    // auto-tag holds a project-wide lock for the duration of the request, so parallel uploads would 409
    const results = await runConcurrently(tasks, options.autoTag ? 1 : undefined);
    const hasErrors = reportFailures(results, output);

    if (isStructuredFormat(options.output)) {
      output.list(
        uploaded.sort((left, right) => left.name.localeCompare(right.name)),
        screenshotView,
      );
    }

    if (hasErrors) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  }

  private async resolveUploadTarget(command: Command, options: UploadOptions): Promise<UploadTarget> {
    const branchService = await this.getBranchService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const branch = await branchService.resolveBranch(options.branch);
    const fileId = options.file
      ? await fileService.resolveFileIds([options.file], branch).then(this.takeFirstFileId(options.file))
      : undefined;
    const directoryId = await directoryService.resolveDirectoryId(options.directory, branch);
    const labelIds = await labelService.resolveLabelIds(toArray(options.label));

    return { autoTag: options.autoTag ?? false, branchId: branch?.id, fileId, directoryId, labelIds };
  }

  private async upsertScreenshot(
    imagePath: string,
    [existingScreenshot, ...duplicates]: ScreenshotView[],
    target: UploadTarget,
    command: Command,
  ): Promise<ScreenshotView | null> {
    const storageService = await this.getStorageService(command);
    const imageName = path.basename(imagePath);
    const storage = await storageService.addStorage(Bun.file(imagePath));

    if (!existingScreenshot) {
      return this.addScreenshot(imageName, storage.data.id, target, command);
    }

    if (duplicates.length > 0) {
      this.getOutput(command).warning(
        `Found ${duplicates.length + 1} screenshots named '${imageName}', updating '#${existingScreenshot.id}'`,
      );
    }

    return this.updateScreenshot(existingScreenshot.id, imageName, storage.data.id, target, command);
  }

  private async addScreenshot(
    imageName: string,
    storageId: number,
    { autoTag, branchId, fileId, directoryId, labelIds }: UploadTarget,
    command: Command,
  ): Promise<ScreenshotView | null> {
    const screenshotService = await this.getScreenshotService(command);
    const request: ScreenshotsModel.CreateScreenshotRequest = {
      name: imageName,
      storageId,
      autoTag,
      ...(branchId !== undefined ? { branchId } : {}),
      ...(fileId !== undefined ? { fileId } : {}),
      ...(directoryId !== undefined ? { directoryId } : {}),
      ...(labelIds !== undefined ? { labelIds } : {}),
    };

    try {
      return await screenshotService.upload(request);
    } catch (error) {
      if (screenshotService.isAutoTagInProgressError(error)) {
        this.getOutput(command).warning(
          `Tags were not applied for ${imageName} because auto tag is currently in progress`,
        );
        return null;
      }

      throw error;
    }
  }

  private async updateScreenshot(
    id: number,
    imageName: string,
    storageId: number,
    { autoTag, branchId, fileId, directoryId, labelIds }: UploadTarget,
    command: Command,
  ): Promise<ScreenshotView | null> {
    const screenshotService = await this.getScreenshotService(command);

    await screenshotService.update(id, { name: imageName, storageId, usePreviousTags: !autoTag });

    if (labelIds !== undefined) {
      await screenshotService.replaceLabels(id, labelIds);
    }

    if (autoTag) {
      try {
        await screenshotService.replaceTags(id, {
          autoTag: true,
          ...(branchId !== undefined ? { branchId } : {}),
          ...(fileId !== undefined ? { fileId } : {}),
          ...(directoryId !== undefined ? { directoryId } : {}),
        });
      } catch (error) {
        if (!screenshotService.isAutoTagInProgressError(error)) {
          throw error;
        }

        this.getOutput(command).warning(
          `Tags were not applied for ${imageName} because auto tag is currently in progress`,
        );
      }
    }

    return screenshotService.get(id);
  }

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

  private async isDirectory(inputPath: string): Promise<boolean> {
    try {
      return (await stat(inputPath)).isDirectory();
    } catch {
      throw new CliError(`File '${inputPath}' not found in the Crowdin project`);
    }
  }

  private validateImageFormat(imagePath: string): void {
    if (!this.isAllowedImage(imagePath)) {
      throw new CliError(`Wrong format of the file. Supported formats: ${SUPPORTED_FORMATS}`);
    }
  }

  // every image under the directory, recursively, hidden entries skipped
  private async collectImagePaths(directoryPath: string): Promise<string[]> {
    const imagePaths = (await Array.fromAsync(new Glob('**/*').scan({ cwd: directoryPath })))
      .filter((relativePath) => this.isAllowedImage(relativePath))
      .sort()
      .map((relativePath) => path.join(directoryPath, relativePath));

    if (imagePaths.length === 0) {
      throw new CliError(`No screenshots found in '${directoryPath}'. Supported formats: ${SUPPORTED_FORMATS}`);
    }

    // the name is what an upload upserts by, so same-named images would overwrite each other
    const pathsByName = Map.groupBy(imagePaths, (imagePath) => path.basename(imagePath));
    const clashes = [...pathsByName.values()].filter((paths) => paths.length > 1);

    if (clashes.length > 0) {
      throw new CliError(
        `Screenshot names must be unique, found images with the same name: ${clashes.map((paths) => paths.join(', ')).join('; ')}`,
      );
    }

    return imagePaths;
  }

  private isAllowedImage(filePath: string): boolean {
    return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(filePath).slice(1).toLowerCase());
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
}
