import path from 'node:path';
import type { Command } from 'commander';
import type Client from '../../../lib/api/client.ts';
import SourceFileLoader from '../../../lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '../../../lib/config/translationPathResolver.ts';
import type { Config } from '../../../lib/config.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { CommandDef } from '../../types.ts';
import type { Output } from '../../utils/output.ts';
import type { StorageService } from '../../services/StorageService.ts';

type GetConfig = (command: Command) => Promise<Config>;
type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;
type GetStorageService = (command: Command) => Promise<StorageService>;
type GetApiClient = (command: Command) => Promise<Client>;

export default class UploadCommand {
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
      name: 'upload',
      alias: 'push',
      description: 'Upload source files to a Crowdin project',
      action: this.defaultAction,
      subcommands: [
        {
          name: 'sources',
          description: 'Upload source files to a Crowdin project',
          action: this.uploadSourcesAction,
        },
        {
          name: 'translations',
          description: 'Upload translation files to a Crowdin project',
          action: this.uploadTranslationsAction,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.uploadSourcesAction(command);
  };

  uploadSourcesAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const apiClient = await this.getApiClient(command);
    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles();
    const projectFilePaths = new Map(projectFiles.data.map((file) => [file.data.path, file.data.id]));
    const projectDirectories = new Map(
      (await projectService.directory.loadProjectDirectories()).map(
        (directory) => [
          directory.data.path,
          directory.data.id
        ]),
    );
    const sourceFileLoader = new SourceFileLoader(config);

    for (const patterns of config.files) {
      for (const localFilePath of sourceFileLoader.getFilePathsForPattern(patterns.source)) {
        const storage = await storageService.addStorage(Bun.file(localFilePath));

        if (projectFilePaths.has(`/${localFilePath}`)) {
          await projectService.file.updateProjectFile(
            projectFilePaths.get(`/${localFilePath}`) as number,
            storage.data.id,
            localFilePath,
          );
          output.success(`File ${localFilePath} updated`);
          continue;
        }

        const pathDetails = path.parse(localFilePath);
        let directoryId: number | undefined;

        if (pathDetails.dir !== '') {
          directoryId = await this.addProjectDirectories(pathDetails, projectDirectories, projectService);
        }

        await apiClient.addProjectFile(
          project.data.id,
          storage.data.id,
          pathDetails.base,
          directoryId,
          patterns.translation,
        );

        output.success(`File ${localFilePath} created`);
      }
    }
  };

  private async addProjectDirectories(
    pathDetails: ReturnType<typeof path.parse>,
    projectDirectories: Map<string, number>,
    projectService: ProjectService,
  ) {
    const directories = pathDetails.dir.split(path.sep);
    let directoryId: number | undefined;

    for (let index = 0; index < directories.length; index++) {
      const directoryName = directories[index] as string;
      const directoryPath = directories.reduce((previousValue, currentValue, currentIndex): string => {
        if (previousValue === '/') {
          return previousValue + currentValue;
        }

        if (currentIndex > index) {
          return previousValue;
        }

        return `${previousValue}/${currentValue}`;
      }, '/');

      if (projectDirectories.has(directoryPath)) {
        directoryId = projectDirectories.get(directoryPath);
        continue;
      }

      const projectDirectory = await projectService.directory.createProjectDirectory(directoryName, directoryId);

      directoryId = projectDirectory.data.id;
      projectDirectories.set(projectDirectory.data.path, projectDirectory.data.id);
    }

    return directoryId;
  }

  uploadTranslationsAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const translationPathResolver = new TranslationPathResolver(config);
    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles();

    for (const projectFile of projectFiles.data) {
      for (const targetLanguage of project.data.targetLanguages) {
        const filePath = translationPathResolver.resolve(Bun.file(projectFile.data.path), targetLanguage).slice(1);

        if (!(await Bun.file(filePath).exists())) {
          output.warning(`File ${filePath} does not exist in the specified location`);
          continue;
        }

        output.info(`Importing translations for file '${filePath}'`);

        const storage = await storageService.addStorage(Bun.file(filePath));

        await projectService.translation.importProjectTranslation(
          storage.data.id,
          projectFile.data.id,
          [targetLanguage.id],
          filePath,
        );

        output.success(`File ${filePath} was queued for translations import`);
      }
    }
  };
}
