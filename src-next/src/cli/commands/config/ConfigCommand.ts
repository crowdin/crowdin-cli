import type { Command } from 'commander';
import { ZodError, z } from 'zod';
import SourceFileLoader from '../../../lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '../../../lib/config/translationPathResolver.ts';
import { loadFromFile } from '../../../lib/config/yamlLoader.ts';
import type { Config } from '../../../lib/config.ts';
import CliError from '../../errors/CliError.ts';
import type { GlobalOptions } from '../../options.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { CommandDef } from '../../types.ts';
import type { Output } from '../../utils/output.ts';

type GetConfig = (command: Command) => Promise<Config>;
type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;

export default class ConfigCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'config',
      description: 'List files matching wild-card patterns, validate configuration',
      subcommands: [
        {
          name: 'sources',
          description: 'List files matching wild-card patterns',
          action: this.listSourcesAction,
        },
        {
          name: 'translations',
          description: 'List translation files that match the wild-card patterns',
          action: this.listTranslationsAction,
        },
        {
          name: 'lint',
          description: 'Analyze your configuration file for possible errors',
          action: this.lintAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command?.help();
  };

  listSourcesAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    await projectService.loadProject();
    const localFilePaths = new SourceFileLoader(config).getFilePaths();

    output.log(
      localFilePaths.map((localFilePath) => ({ File: localFilePath })),
      { showAsTable: true },
    );
  };

  listTranslationsAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();
    const translationPathResolver = new TranslationPathResolver(config);
    const sourceFilePaths = new SourceFileLoader(config).getFilePaths();
    const translationFilePaths: Array<{ File: string }> = [];

    for (const targetLanguage of project.data.targetLanguages.sort((a, b) => a.name.localeCompare(b.name))) {
      for (const sourceFilePath of sourceFilePaths) {
        const filePath = translationPathResolver.resolve(Bun.file(sourceFilePath), targetLanguage).slice(1);
        translationFilePaths.push({ File: filePath });
      }
    }

    output.log(translationFilePaths, { showAsTable: true });
  };

  lintAction = async (command: Command) => {
    const options = command.optsWithGlobals() as GlobalOptions;
    const output = this.getOutput(command);
    const configPath = options.config || `${process.cwd()}/crowdin.yml`;

    try {
      await loadFromFile(configPath);
      output.success('Configuration file looks good');
    } catch (error) {
      const message = this.getLintErrorMessage(error);
      output.error(message);
      throw new CliError(message, 1, true);
    }
  };

  private getLintErrorMessage(error: unknown): string {
    let message = 'Configuration file is invalid';

    switch (true) {
      case error instanceof ZodError:
        message += `.\n${z.prettifyError(error)}`;
        break;
      case error instanceof Error:
        message += `. ${error.message}`;
        break;
    }

    return message;
  }
}
