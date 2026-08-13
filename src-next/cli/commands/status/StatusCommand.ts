import type { LanguagesModel, ResponseObject, TranslationStatusModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { branch, projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetDirectoryService,
  GetFileService,
  GetOutput,
  GetProgressService,
  GetProjectService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
import { directory, file, proofreading, status, translation } from './options.ts';
import {
  type ProgressRow,
  type ProgressView,
  statusPlainVerboseView,
  statusPlainView,
  statusTableView,
  toProgressMap,
} from './views.ts';

interface StatusCommandOptions extends GlobalOptions {
  language?: string;
  branch?: string;
  file?: string;
  directory?: string;
  failIfIncomplete?: boolean;
}

type LanguageProgress = ResponseObject<TranslationStatusModel.LanguageProgress>;

export default class StatusCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getProgressService: GetProgressService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'status',
      description: 'Show translation and proofreading progress for a project',
      action: this.defaultAction,
      options: [status.language, branch, file, directory, status.failIfIncomplete, projectConfigGroup],
      subcommands: [
        {
          name: 'translation',
          description: 'Show translation progress for a project',
          options: [translation.language, branch, file, directory, translation.failIfIncomplete, projectConfigGroup],
          action: this.translationStatusAction,
        },
        {
          name: 'proofreading',
          description: 'Show proofreading progress for a project',
          options: [proofreading.language, branch, file, directory, proofreading.failIfIncomplete, projectConfigGroup],
          action: this.proofreadingStatusAction,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.showProgress('all', command);
  };

  translationStatusAction = async (command: Command) => {
    await this.showProgress('translated', command);
  };

  proofreadingStatusAction = async (command: Command) => {
    await this.showProgress('proofread', command);
  };

  private async showProgress(show: ProgressView, command: Command) {
    const options = command.optsWithGlobals() as StatusCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const branchService = await this.getBranchService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const progressService = await this.getProgressService(command);
    const project = await projectService.loadProject();
    const languageId = options.language || null;
    const branchName = this.normalizeBranch(options.branch);
    const filePath = options.file;
    const directoryPath = options.directory;
    const failIfIncomplete = Boolean(options.failIfIncomplete);
    const targetLanguageIds = project.data.targetLanguages.map((language) => language.id);

    if (languageId && languageId !== 'all' && !targetLanguageIds.includes(languageId)) {
      throw new CliError(`Language '${languageId}' doesn't exist in the project. Try specifying another language code`);
    }

    if (filePath && directoryPath) {
      throw new CliError("Only one of the following options can be used at a time: '--file', '--directory'");
    }

    let progressData: LanguageProgress[];

    if (filePath) {
      const projectFiles = await fileService.loadProjectFiles();
      const normalizedFilePath = this.normalizePath(filePath);
      const projectFile = projectFiles.data.find(
        (fileEntry) => this.normalizePath(fileEntry.data.path) === normalizedFilePath,
      );

      if (!projectFile) {
        throw new CliError(`Project doesn't contain the '${filePath}' file`);
      }

      const fileProgress = await progressService.loadFileProgress(projectFile.data.id);
      progressData = fileProgress.data;
    } else if (directoryPath) {
      const projectDirectories = await directoryService.loadProjectDirectories();
      const normalizedDirectoryPath = this.normalizePath(directoryPath);
      const projectDirectory = projectDirectories.find(
        (directoryEntry) => this.normalizePath(directoryEntry.data.path) === normalizedDirectoryPath,
      );

      if (!projectDirectory) {
        throw new CliError(`Project doesn't contain the '${directoryPath}' directory`);
      }

      const directoryProgress = await progressService.loadDirectoryProgress(projectDirectory.data.id);
      progressData = directoryProgress.data;
    } else if (branchName) {
      const branches = await branchService.list();
      const projectBranch = branches.find((branch) => branch.name === branchName);

      if (!projectBranch) {
        throw new CliError(
          "The branch with the specified name doesn't exist in the project. Try specifying another branch name",
        );
      }

      const branchProgress = await progressService.loadBranchProgress(projectBranch.id);
      progressData = branchProgress.data;
    } else {
      const projectProgress = await progressService.loadProjectProgress();
      progressData = projectProgress.data;
    }

    const filteredProgressData = progressData.filter((entry) => {
      if (!languageId || languageId === 'all') {
        return true;
      }

      return entry.data.languageId === languageId;
    });

    const rows = this.toRows(filteredProgressData, project.data.targetLanguages);
    const progress = toProgressMap(rows, show);

    // json/toon serialize the percent map; text renders the same grid either way, which --verbose
    // widens with the word and phrase counts, and plain swaps its "<lang> <percent>" lines for
    // Java's detailed ones.
    if (options.output === 'plain') {
      output.item(progress, options.verbose ? statusPlainVerboseView(rows, show) : statusPlainView(rows, show));
    } else {
      output.table(isMachineFormat(options.output) ? progress : statusTableView(rows, show, options.verbose));
    }

    // Thrown after the progress is printed, so a failing --fail-if-incomplete run still shows which
    // languages are behind. Java skips the check in verbose mode; here --verbose only changes the
    // rendering, so it has no say in the exit code.
    if (failIfIncomplete) {
      this.throwIfIncomplete(show, filteredProgressData);
    }
  }

  // The 100%-when-nothing-to-translate rule is applied here, once, so the views and the
  // completeness check can't disagree about what a language's progress is.
  private toRows(data: LanguageProgress[], targetLanguages: LanguagesModel.Language[]): ProgressRow[] {
    const names = new Map(targetLanguages.map((language) => [language.id, language.name]));

    return data.map((entry) => ({
      languageId: entry.data.languageId,
      name: names.get(entry.data.languageId) ?? entry.data.languageId,
      translation: this.getTranslationProgress(entry),
      approval: this.getApprovalProgress(entry),
      words: entry.data.words,
      phrases: entry.data.phrases,
    }));
  }

  private normalizePath(value: string): string {
    const normalizedValue = toPosixPath(value);

    if (normalizedValue.startsWith('/')) {
      return normalizedValue;
    }

    return `/${normalizedValue}`;
  }

  private normalizeBranch(value?: string): string | null {
    if (!value || value === 'none') {
      return null;
    }

    return value;
  }

  private hasNothingToTranslate(progress: LanguageProgress): boolean {
    return progress.data.words?.total === 0;
  }

  private getTranslationProgress(progress: LanguageProgress): number {
    if (this.hasNothingToTranslate(progress)) {
      return 100;
    }

    return progress.data.translationProgress;
  }

  private getApprovalProgress(progress: LanguageProgress): number {
    if (this.hasNothingToTranslate(progress)) {
      return 100;
    }

    return progress.data.approvalProgress;
  }

  private throwIfIncomplete(show: ProgressView, progressData: LanguageProgress[]): void {
    for (const progress of progressData) {
      if ((show === 'all' || show === 'translated') && this.getTranslationProgress(progress) < 100) {
        throw new CliError('The current project is incomplete');
      }

      if ((show === 'all' || show === 'proofread') && this.getApprovalProgress(progress) < 100) {
        throw new CliError('The current project is incomplete');
      }
    }
  }
}
