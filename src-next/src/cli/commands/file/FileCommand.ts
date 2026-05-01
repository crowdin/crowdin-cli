import path from 'node:path';
import type { ResponseObject, SourceFilesModel, UploadStorageModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import type Client from '../../../lib/api/client.ts';
import type { Config } from '../../../lib/config.ts';
import CliError, { toCliError } from '../../errors/CliError.ts';
import type { GlobalOptions } from '../../options.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { CommandDef } from '../../types.ts';
import type { Output } from '../../utils/output.ts';
import destination from './options/destination.ts';
import label from './options/label.ts';
import parserVersion from './options/parserVersion.ts';
import type from './options/type.ts';
import type { StorageService } from '../../services/StorageService.ts';

interface UploadFileCommandOptions extends GlobalOptions {
  dest?: string;
  type?: string;
  parserVersion?: string;
}

type GetConfig = (command: Command) => Promise<Config>;
type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;
type GetStorageService = (command: Command) => Promise<StorageService>;
type GetApiClient = (command: Command) => Promise<Client>;

export default class FileCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getApiClient: GetApiClient,
  ) {
  }

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
    await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles();

    output.log(
      projectFiles.data.map((file) => ({ id: file.data.id, path: file.data.path })),
      { showAsTable: true },
    );
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [filePath] = command.args;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const apiClient = await this.getApiClient(command);
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
          const projectDirectory = await projectService.directory.createProjectDirectory(
            directory,
            parentDirectoryId,
          );
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

    try {
      await apiClient.addProjectFile(
        config.projectId,
        storage.data.id,
        destPath,
        parentDirectoryId,
        undefined,
        fileType,
        parserVersion,
      );
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }

      throw toCliError(error, `Failed to create ${filePath}`);
    }

    output.success(`File ${filePath} created`);
  };

  downloadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [filePath] = command.args;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const apiClient = await this.getApiClient(command);

    if (!filePath) {
      throw new CliError('File path is required');
    }

    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles();

    for (const projectFile of projectFiles.data) {
      if (projectFile.data.path === `${filePath}`) {
        const destPath = options.dest || filePath;

        try {
          const downloadLink = await apiClient.downloadProjectFile(project.data.id, projectFile.data.id);
          await Bun.file(`${config.basePath}/${destPath}/${path.basename(filePath)}`).write(
            await fetch(downloadLink.data.url),
          );
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
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const apiClient = await this.getApiClient(command);

    if (!filePath) {
      throw new CliError('File path is required');
    }

    await projectService.loadProject();

    const projectFiles = await projectService.loadProjectFiles();

    for (const file of projectFiles.data) {
      if (file.data.path === `/${filePath}`) {
        try {
          await apiClient.deleteProjectFile(config.projectId, file.data.id);
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
