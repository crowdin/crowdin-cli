import type { Command } from 'commander';
import { ZodError, z } from 'zod';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetConfig, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import SourceFileLoader from '@/lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '@/lib/config/translationPathResolver.ts';
import { loadFromFile } from '@/lib/config/yamlLoader.ts';

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

    output.table(
      localFilePaths.map((localFilePath) => ({ file: localFilePath })),
    );
  };

  listTranslationsAction = async (command: Command) => {
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();
    const translationPathResolver = new TranslationPathResolver(config);
    const sourceFilePaths = new SourceFileLoader(config).getFilePaths();
    const translationFilePaths: Array<{ file: string }> = [];

    for (const targetLanguage of project.data.targetLanguages.sort((a, b) => a.name.localeCompare(b.name))) {
      for (const sourceFilePath of sourceFilePaths) {
        const filePath = translationPathResolver.resolve(Bun.file(sourceFilePath), targetLanguage).slice(1);
        translationFilePaths.push({ file: filePath });
      }
    }

    output.table(translationFilePaths);
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
