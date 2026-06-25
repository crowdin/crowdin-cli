import path from 'node:path';
import type { Command } from 'commander';
import { ZodError, z } from 'zod';
import { filesConfigGroup } from '@/cli/commands/common/options/configGroups.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetConfig, GetLanguageService, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import FileNotFoundError from '@/lib/common/errors/FileNotFoundError.ts';
import SourceFileLoader, { commonPath } from '@/lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '@/lib/config/translationPathResolver.ts';
import { loadFromFile } from '@/lib/config/yamlLoader.ts';
import type { Config } from '@/lib/config.ts';

export default class ConfigCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getLanguageService: GetLanguageService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'config',
      description: 'List files matching wild-card patterns, validate configuration',
      subcommands: [
        {
          name: 'sources',
          description: 'List files matching wild-card patterns',
          options: [filesConfigGroup],
          action: this.listSourcesAction,
        },
        {
          name: 'translations',
          description: 'List translation files that match the wild-card patterns',
          options: [filesConfigGroup],
          action: this.listTranslationsAction,
        },
        {
          name: 'lint',
          description: 'Analyze your configuration file for possible errors',
          options: [filesConfigGroup],
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

    // With preserve_hierarchy off, Java's DryrunSources strips the files' common parent directory so
    // the listing shows paths relative to it; with it on, the full hierarchy is kept.
    const prefix = config.preserveHierarchy ? '' : commonPath(localFilePaths);
    const displayedPaths = localFilePaths
      .map((localFilePath) => (localFilePath.startsWith(prefix) ? localFilePath.slice(prefix.length) : localFilePath))
      .sort();

    output.table(displayedPaths.map((file) => ({ file })));
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
    const configPath = options.config || path.join(process.cwd(), 'crowdin.yml');

    try {
      const config = await loadFromFile(configPath);
      await this.validateLanguagesMapping(config, command);
      output.success('Configuration file looks good');
    } catch (error) {
      const message = this.getLintErrorMessage(error);

      output.error(message);

      // A missing config file is NotFound (102) like Java; invalid content is Validation (2).
      if (error instanceof FileNotFoundError) {
        throw new NotFoundError(message, true);
      }

      throw new ValidationError(message, true);
    }
  };

  // Lint-only check: every `languages_mapping` source-language key must be a real Crowdin language id
  // (mirrors Java PropertiesWithFiles.checkProperties, which validates against listSupportedLanguages).
  private async validateLanguagesMapping(config: Config, command: Command): Promise<void> {
    const filesWithMapping = config.files.filter((file) => file.languages_mapping);
    if (filesWithMapping.length === 0) {
      return;
    }

    const languageService = await this.getLanguageService(command);
    const supportedLanguages = await languageService.listSupportedLanguages();
    const supportedCodes = new Set(supportedLanguages.map((language) => language.id.toLowerCase()));

    const hasInvalidCode = filesWithMapping.some((file) =>
      Object.values(file.languages_mapping ?? {}).some((mapping) =>
        Object.keys(mapping).some((languageCode) => !supportedCodes.has(languageCode.toLowerCase())),
      ),
    );

    if (hasInvalidCode) {
      throw new Error(
        'The mapping format is the following: crowdin_language_code: code_you_use. ' +
          'Check the full list of Crowdin language codes that can be used for mapping: ' +
          'https://developer.crowdin.com/language-codes.',
      );
    }
  }

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
