import type { Command } from 'commander';
import { ZodError, z } from 'zod';
import { filesConfigGroup, tree as treeOption } from '@/cli/commands/common/options.ts';
import { pathView } from '@/cli/commands/common/views.ts';
import ForbiddenError from '@/cli/errors/ForbiddenError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GetConfig, GetLanguageService, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { printFileTree } from '@/cli/utils/fileTree.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import FileNotFoundError from '@/lib/common/errors/FileNotFoundError.ts';
import SourceFileLoader from '@/lib/config/SourceFileLoader.ts';
import { resolveTranslationPath } from '@/lib/config/translationPathResolver.ts';
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { getCommonPath } from '@/lib/upload/fileOptions.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';

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
          description: 'List source files that match the wild-card patterns',
          options: [treeOption, filesConfigGroup],
          action: this.listSourcesAction,
        },
        {
          name: 'translations',
          description: 'List translation files that match the wild-card patterns',
          options: [treeOption, filesConfigGroup],
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

    assertFilesConfigured(config);

    await projectService.loadProject();
    const localFilePaths = new SourceFileLoader(config).getFilePaths();

    // With preserve_hierarchy off, Java's DryrunSources strips the files' common parent directory so
    // the listing shows paths relative to it; with it on, the full hierarchy is kept.
    const prefix = config.preserveHierarchy ? '' : getCommonPath(localFilePaths);
    const displayedPaths = localFilePaths
      .map((localFilePath) => (localFilePath.startsWith(prefix) ? localFilePath.slice(prefix.length) : localFilePath))
      .sort();

    // Tree is an interactive-only rendering; a machine --output (json/toon/plain) is a parseable
    // contract and wins, falling through to output.list so the format stays intact.
    const { tree, output: outputFormat } = command.optsWithGlobals();

    if (tree && !isMachineFormat(outputFormat)) {
      printFileTree(displayedPaths, output);
      return;
    }

    output.list(displayedPaths, pathView, { empty: 'No source files found' });
  };

  listTranslationsAction = async (command: Command) => {
    const options = command.optsWithGlobals();
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);

    assertFilesConfigured(config);

    const project = await projectService.loadProject();

    // Only managers/developers get a ProjectSettings response, so its presence is the access probe
    // (mirrors Java ListTranslationsAction's isManagerAccess guard).
    if (!('translateDuplicates' in project.data)) {
      const message = 'You must have manager or developer role in the project to perform this action';

      // A machine format owes the caller a result document, and a warning followed by exit 0 reads
      // as 'no translations' instead of 'you may not ask'. Print first, then throw so the exit code
      // carries the reason — the same order lintAction uses (Java only branches on --plain here).
      if (isMachineFormat(options.output)) {
        output.error(message);
        throw new ForbiddenError(message, true);
      }

      output.warning(message);
      return;
    }

    // Server-side language mapping and the in-context pseudo-language come from project settings,
    // matching Java's getLanguageMapping() + getProjectLanguages(withInContextLang=true).
    const settings = project.data;
    const serverLanguageMapping = settings.languageMapping;
    const languages = [...settings.targetLanguages];

    if (settings.inContext && settings.inContextPseudoLanguage) {
      languages.push(settings.inContextPseudoLanguage);
    }

    const sourceFileLoader = new SourceFileLoader(config);
    const translationFilePaths = new Set<string>();

    // Java DryrunTranslations.getFiles flat-maps over the file groups, resolving each group's own
    // sources against that group's `translation`, then de-duplicates. Iterating the deduped union of
    // sources instead would collapse a file matched by two groups into whichever group came first.
    for (const patterns of config.files) {
      // biome-ignore format: manual formatting looks better
      const sourceFilePaths = sourceFileLoader.getFilePathsForPattern(
        patterns.source,
        patterns.ignore,
        {
          languages,
          serverLanguageMapping,
          fileLanguageMapping: patterns.languages_mapping,
        },
      );

      for (const sourceFilePath of sourceFilePaths) {
        for (const targetLanguage of languages) {
          // The resolved path only has a leading slash when the configured pattern does.
          translationFilePaths.add(
            stripLeadingSlashes(
              resolveTranslationPath(patterns, sourceFilePath, targetLanguage, serverLanguageMapping),
            ),
          );
        }
      }
    }

    const displayedPaths = [...translationFilePaths].sort();

    // Same gate as the sources listing above: a machine format outranks --tree.
    if (options.tree && !isMachineFormat(options.output)) {
      printFileTree(displayedPaths, output);
      return;
    }

    output.list(displayedPaths, pathView, { empty: 'No translation files found' });
  };

  lintAction = async (command: Command) => {
    const output = this.getOutput(command);

    try {
      // Full resolution pipeline (config file + env vars + token/identity/CLI), same as every
      // other command. getConfig already resolves base_path relative to the config file's dir,
      // so on-disk source checks are accurate.
      const config = await this.getConfig(command);

      assertFilesConfigured(config);

      this.checkSourceFilesExist(config);
      await this.validateLanguagesMapping(config, command);

      output.success('Your configuration file looks good');
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

  // Lint-only check: every `source` pattern must match at least one file on disk
  // (mirrors Java PropertiesWithFiles.checkSourceFilesExist, gated to CheckType.LINT).
  private checkSourceFilesExist(config: Config): void {
    const loader = new SourceFileLoader(config);

    for (const file of config.files) {
      if (loader.getFilePathsForPattern(file.source, file.ignore).length === 0) {
        throw new Error(
          `No source files found for '${file.source}' pattern. Verify the path exists and matches files in your project`,
        );
      }
    }
  }

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
