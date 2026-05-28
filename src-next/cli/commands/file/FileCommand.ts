import path from 'node:path';
import type { ResponseObject, SourceFilesModel, UploadStorageModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetConfig,
  GetDirectoryService,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetStorageService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import destination from './options/destination.ts';
import label from './options/label.ts';
import parserVersion from './options/parserVersion.ts';
import type from './options/type.ts';

interface UploadFileCommandOptions extends GlobalOptions {
  dest?: string;
  type?: string;
  parserVersion?: string;
}

export default class FileCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'file',
      description: 'Manage source files and translations',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of source files in the current project',
          action: this.listAction,
        },
        {
          name: 'upload',
          description: 'Upload a file to a Crowdin project',
          arguments: [
            {
              name: 'file',
              description: 'Path to file to upload',
            },
          ],
          options: [
            label,
            {
              name: 'dest',
              short: 'd',
              type: 'string',
              description: 'File destination in the Crowdin project',
            },
            type,
            parserVersion,
          ],
          action: this.uploadAction,
        },
        {
          name: 'download',
          description: 'Download a file to a specified location',
          arguments: [
            {
              name: 'file',
              description: 'Crowdin file path for download',
            },
          ],
          options: [destination],
          action: this.downloadAction,
        },
        {
          name: 'delete',
          description: 'Delete a file in a Crowdin project',
          arguments: [
            {
              name: 'file',
              description: 'Path to the file in the Crowdin project',
            },
          ],
          action: this.deleteAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command?.help();
  };

  listAction = async (command: Command) => {
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    await projectService.loadProject();
    const projectFiles = await fileService.loadProjectFiles();

    output.table(projectFiles.data.map((file) => ({ id: file.data.id, path: file.data.path })));
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [filePath] = command.args;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const destPath = options.dest || filePath;
    const fileType = options.type as SourceFilesModel.FileType | undefined;
    const parserVersion = options.parserVersion ? parseInt(options.parserVersion, 10) : undefined;

    if (!filePath) {
      throw new CliError('File path is required');
    }

    if (!destPath) {
      throw new CliError('Destination path is required');
    }

    if (parserVersion !== undefined && fileType === undefined) {
      throw new CliError('Type is required for parser version');
    }

    await projectService.loadProject();

    let parentDirectoryId: number | undefined;
    const pathDetails = path.parse(destPath);

    if (pathDetails.dir !== '') {
      const directories = pathDetails.dir.split(path.sep);

      for (const directory of directories) {
        try {
          const projectDirectory = await directoryService.createProjectDirectory(directory, parentDirectoryId);
          parentDirectoryId = projectDirectory.data.id;
          output.success(`Directory ${directory} created`);
        } catch (error) {
          throw toCliError(error, `Failed to create directory ${directory}`);
        }
      }
    }

    let storage: ResponseObject<UploadStorageModel.Storage>;

    try {
      const file = Bun.file(filePath);
      storage = await storageService.addStorage(file);
    } catch (error) {
      throw toCliError(error, `Failed to upload ${filePath}`);
    }

    await fileService.createProjectFile({
      storageId: storage.data.id,
      name: destPath,
      directoryId: parentDirectoryId,
      type: fileType,
      parserVersion,
    });

    output.success(`File ${filePath} created`);
  };

  downloadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [filePath] = command.args;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);

    if (!filePath) {
      throw new CliError('File path is required');
    }

    await projectService.loadProject();
    const projectFiles = await fileService.loadProjectFiles();

    for (const projectFile of projectFiles.data) {
      if (projectFile.data.path === `${filePath}`) {
        const destPath = options.dest || filePath;

        try {
          const downloadUrl = await fileService.getSourceFileDownloadUrl(projectFile.data.id);
          const fullFilePath = `${config.basePath}/${destPath}/${path.basename(filePath)}`;
          await Bun.file(fullFilePath).write(await fetch(downloadUrl));
        } catch (error) {
          throw toCliError(error, `Failed to download ${filePath}`);
        }

        output.success(`File ${filePath} downloaded`);
        return;
      }
    }

    throw new CliError(`File ${filePath} not found in the Crowdin project`);
  };

  deleteAction = async (command: Command) => {
    const [filePath] = command.args;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);

    if (!filePath) {
      throw new CliError('File path is required');
    }

    await projectService.loadProject();
    const projectFiles = await fileService.loadProjectFiles();

    for (const file of projectFiles.data) {
      if (file.data.path === `/${filePath}`) {
        try {
          await fileService.deleteProjectFile(file.data.id, file.data.path);
        } catch (error) {
          throw toCliError(error, `Failed to delete ${filePath}`);
        }

        output.success(`File ${filePath} deleted`);
        return;
      }
    }

    throw new CliError(`File ${filePath} not found`);
  };
}
