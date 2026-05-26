import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetApiClient, GetConfig, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import language from './options/language.ts';

interface DownloadCommandOptions extends GlobalOptions {
  language?: string[];
}

export default class DownloadCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'download',
      alias: 'pull',
      description: 'Download the latest translations from Crowdin',
      action: this.defaultAction,
      subcommands: [
        {
          name: 'sources',
          description: 'Download sources from Crowdin to the specified place',
          action: this.sourcesAction,
        },
        {
          name: 'translations',
          description: 'Download the latest translations from Crowdin to the specified place',
          options: [language],
          action: this.translationsAction,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.translationsAction(command);
  };

  sourcesAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const apiClient = await this.getApiClient(command);
    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles();

    for (const projectFile of projectFiles.data) {
      try {
        const downloadLink = await apiClient.sourceFilesApi.downloadFile(project.data.id, projectFile.data.id);
        const response = await fetch(downloadLink.data.url);
        const filePath = [process.cwd(), config.basePath, projectFile.data.path].join(path.sep);

        await Bun.write(filePath, response);
      } catch (error) {
        throw toCliError(error, `Failed to download ${projectFile.data.path}`);
      }

      output.success(`File ${projectFile.data.path} downloaded`);
    }
  };

  translationsAction = async (command: Command) => {
    const options = command.optsWithGlobals() as DownloadCommandOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const apiClient = await this.getApiClient(command);
    const project = await projectService.loadProject();
    const targetLanguageIds = project.data.targetLanguages.map((language) => language.id);
    const languageIds = options.language ?? [];

    for (const languageId of languageIds) {
      if (!targetLanguageIds.includes(languageId)) {
        throw new CliError(`Language ${languageId} does not exist in project. Try specifying another language code`);
      }
    }

    const build = await projectService.translation.buildProjectTranslations(languageIds);

    output.info('Downloading translations...');

    let response: Response;

    try {
      const downloadLink = await apiClient.translationsApi.downloadTranslations(config.projectId, build.data.id);
      response = await fetch(downloadLink.data.url);
    } catch (error) {
      throw toCliError(error, 'Failed to download project translations');
    }

    const archiveFilePath = '/tmp/pack.zip';

    output.info('Extracting archive...');

    try {
      await Bun.write(archiveFilePath, response);

      const basePath = `${process.cwd()}/${config.basePath}/`;
      const zip = new AdmZip(archiveFilePath);

      zip.extractAllTo(basePath, true);
    } catch (error) {
      throw toCliError(error, 'Failed to extract translations archive');
    }

    output.success('Done');
  };
}
