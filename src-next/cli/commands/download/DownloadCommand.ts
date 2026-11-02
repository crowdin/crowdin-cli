import type { Command } from 'commander';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { branch, dryRun, filesConfigGroup, tree } from '../common/options.ts';
import DownloadSourcesCommand from './DownloadSourcesCommand.ts';
import DownloadTranslationsCommand from './DownloadTranslationsCommand.ts';
import {
  all,
  excludeLanguage,
  exportOnlyApproved,
  ignoreMatch,
  keepArchive,
  language,
  noExportOnlyApproved,
  noSkipUntranslatedFiles,
  noSkipUntranslatedStrings,
  pseudo,
  reviewed,
  skipUntranslatedFiles,
  skipUntranslatedStrings,
} from './options.ts';

export default class DownloadCommand {
  private sourcesCommand: DownloadSourcesCommand;
  private translationsCommand: DownloadTranslationsCommand;

  constructor(
    getConfig: GetConfig,
    getOutput: GetOutput,
    getProjectService: GetProjectService,
    getBranchService: GetBranchService,
    getFileService: GetFileService,
    getTranslationService: GetTranslationService,
  ) {
    this.sourcesCommand = new DownloadSourcesCommand(
      getConfig,
      getOutput,
      getProjectService,
      getBranchService,
      getFileService,
    );
    this.translationsCommand = new DownloadTranslationsCommand(
      getConfig,
      getOutput,
      getProjectService,
      getBranchService,
      getFileService,
      getTranslationService,
    );
  }

  getDefinition(): CommandDef {
    const translationsOptions = [
      branch,
      language,
      excludeLanguage,
      pseudo,
      skipUntranslatedStrings,
      noSkipUntranslatedStrings,
      skipUntranslatedFiles,
      noSkipUntranslatedFiles,
      exportOnlyApproved,
      noExportOnlyApproved,
      keepArchive,
      all,
      dryRun,
      tree,
      ignoreMatch,
      filesConfigGroup,
    ];

    return {
      name: 'download',
      alias: 'pull',
      description: 'Download the latest translations from Crowdin to the specified place',
      options: translationsOptions,
      action: this.translationsCommand.action,
      subcommands: [
        {
          name: 'sources',
          description: 'Download sources from Crowdin to the specified place',
          options: [branch, reviewed, dryRun, filesConfigGroup],
          action: this.sourcesCommand.action,
        },
        {
          name: 'translations',
          description: 'Download the latest translations from Crowdin to the specified place',
          options: translationsOptions,
          action: this.translationsCommand.action,
        },
      ],
    };
  }

  // Thin aliases so callers/tests can drive each subcommand off DownloadCommand.
  sourcesAction = (command: Command) => this.sourcesCommand.action(command);
  translationsAction = (command: Command) => this.translationsCommand.action(command);
}
