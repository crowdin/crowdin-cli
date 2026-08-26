import type { Command } from 'commander';
import type {
  GetBranchService,
  GetConfig,
  GetDirectoryService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetProjectService,
  GetStorageService,
  GetStringService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { branch, dryRun, filesConfigGroup, tree } from '../common/options.ts';
import {
  autoApproveImported,
  cache,
  deleteObsolete,
  excludedLanguage,
  importEqSuggestions,
  label,
  language,
  noAutoUpdate,
  translateHidden,
} from './options.ts';
import UploadSourcesCommand from './UploadSourcesCommand.ts';
import UploadTranslationsCommand from './UploadTranslationsCommand.ts';

export default class UploadCommand {
  private sourcesCommand: UploadSourcesCommand;
  private translationsCommand: UploadTranslationsCommand;

  constructor(
    getConfig: GetConfig,
    getOutput: GetOutput,
    getProjectService: GetProjectService,
    getStorageService: GetStorageService,
    getBranchService: GetBranchService,
    getDirectoryService: GetDirectoryService,
    getFileService: GetFileService,
    getLabelService: GetLabelService,
    getTranslationService: GetTranslationService,
    getStringService: GetStringService,
  ) {
    this.sourcesCommand = new UploadSourcesCommand(
      getConfig,
      getOutput,
      getProjectService,
      getStorageService,
      getBranchService,
      getDirectoryService,
      getFileService,
      getLabelService,
      getStringService,
    );
    this.translationsCommand = new UploadTranslationsCommand(
      getConfig,
      getOutput,
      getProjectService,
      getStorageService,
      getBranchService,
      getFileService,
      getTranslationService,
    );
  }

  getDefinition(): CommandDef {
    const uploadSourcesOptions = [
      branch,
      label,
      excludedLanguage,
      deleteObsolete,
      noAutoUpdate,
      cache,
      dryRun,
      tree,
      filesConfigGroup,
    ];

    return {
      name: 'upload',
      alias: 'push',
      description: 'Upload source files to a Crowdin project',
      options: uploadSourcesOptions,
      action: this.defaultAction,
      subcommands: [
        {
          name: 'sources',
          description: 'Upload source files to a Crowdin project',
          options: uploadSourcesOptions,
          action: this.sourcesCommand.action,
        },
        {
          name: 'translations',
          description: 'Upload translation files to a Crowdin project',
          options: [
            branch,
            language,
            dryRun,
            tree,
            autoApproveImported,
            importEqSuggestions,
            translateHidden,
            filesConfigGroup,
          ],
          action: this.translationsCommand.action,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.sourcesCommand.action(command);
  };

  // Kept as thin aliases so existing callers/tests can drive each subcommand off UploadCommand.
  uploadSourcesAction = (command: Command) => this.sourcesCommand.action(command);
  uploadTranslationsAction = (command: Command) => this.translationsCommand.action(command);
}
