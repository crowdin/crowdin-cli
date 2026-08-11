import path from 'node:path';
import type { LanguagesModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import CliError from '@/cli/errors/CliError.ts';
import WrongLanguageError from '@/cli/errors/WrongLanguageError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetStorageService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { Output } from '@/cli/utils/output.ts';
import SourceFileLoader from '@/lib/config/SourceFileLoader.ts';
import { resolveTranslationPath } from '@/lib/config/translationPathResolver.ts';
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { languagePatterns } from '@/lib/export/patterns.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { getCommonPath, resolveProjectPath } from '@/lib/upload/fileOptions.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import { stripBranchPrefix, stripLeadingSlashes, toProjectPath } from '@/lib/utils/path.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from './uploadFailures.ts';

interface UploadTranslationsOptions extends GlobalOptions {
  branch?: string;
  language?: string;
  autoApproveImported?: boolean;
  importEqSuggestions?: boolean;
  translateHidden?: boolean;
  dryrun?: boolean;
  tree?: boolean;
}

interface TranslationUploadEntry {
  translationPath: string;
  languageIds: string[];
  languageNames: string[];
  fileId?: number;
}

export default class UploadTranslationsCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
    private getTranslationService: GetTranslationService,
  ) {}

  action = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadTranslationsOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const translationService = await this.getTranslationService(command);

    assertFilesConfigured(config);

    const project = await projectService.loadProject();

    if (!hasManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    const targetLanguages = this.filterTargetLanguages(project.data.targetLanguages, options.language);
    const serverLanguageMapping = hasManagerAccess(project) ? project.data.languageMapping : undefined;

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      await this.uploadTranslationsStringsBased(
        options,
        config,
        output,
        branchService,
        storageService,
        translationService,
        targetLanguages,
        serverLanguageMapping,
      );
      return;
    }

    const branch = options.dryrun
      ? await branchService.getBranch(options.branch)
      : (await branchService.getOrCreateBranch(options.branch)).branch;
    const branchId = branch?.id;
    const projectFiles = await fileService.loadProjectFiles(branchId);
    // Server paths carry the branch name; the project paths resolved from the config never do.
    const projectFilePaths = new Map(
      projectFiles.data.map((file) => [stripBranchPrefix(file.data.path, branch?.name), file.data.id]),
    );
    const sourceFileLoader = new SourceFileLoader(config);

    const { entries, hasErrors: entriesHaveErrors } = this.buildTranslationEntries(
      config,
      sourceFileLoader,
      targetLanguages,
      serverLanguageMapping,
      output,
      options.output === 'plain',
      // Java's dry run (ListTranslationsAction -> DryrunTranslations) resolves translation paths
      // from local sources only; it never looks the source up in the project.
      options.dryrun ? undefined : (projectPath) => fileLookup(toProjectPath(projectPath), projectFilePaths)?.id,
    );

    if (options.dryrun && printDryRunPaths(this.dryRunPaths(entries), options, output)) {
      return;
    }

    const tasks = entries.map((entry) => async () => {
      const localFilePath = path.join(config.basePath, entry.translationPath);

      if (!(await Bun.file(localFilePath).exists())) {
        output.warning(`File ${entry.translationPath} does not exist in the specified location`);
        return;
      }

      if (options.dryrun) {
        output.info(`File ${entry.translationPath} would be queued for translations import`);
        return;
      }

      const storage = await storageService.addStorage(Bun.file(localFilePath));

      try {
        output.log(this.importingMessage(entry.translationPath));

        // importProjectTranslation returns only once the server-side import has finished.
        await translationService.importProjectTranslation(
          storage.data.id,
          entry.fileId as number,
          entry.languageIds,
          entry.translationPath,
          options.autoApproveImported,
          options.importEqSuggestions,
          options.translateHidden,
          (status) => output.debug(this.progressMessage(entry.translationPath, status)),
        );
      } catch (error) {
        if (error instanceof WrongLanguageError) {
          output.warning(
            `Translation file '${entry.translationPath}' hasn't been uploaded since the following target language(s) ` +
              `are not enabled for the source file in your Crowdin project: ${entry.languageNames.join('/')}`,
          );
          return;
        }

        throw error;
      }

      output.success(`File '${entry.translationPath}'`);
    });

    const results = await runConcurrently(tasks);

    // A dry run only previews; like Java's separate list action it never fails the process.
    const failed = reportFailures(results, output);
    if (!options.dryrun && (failed || entriesHaveErrors)) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  };

  /**
   * Builds the list of translation uploads from local source files, mirroring Java's
   * UploadTranslationsAction: sources are resolved to project paths (honoring dest /
   * preserve_hierarchy / ignore), and each source expands to one entry per target language —
   * or a single multi-language entry when a `scheme` is set and the translation pattern has no
   * language placeholder.
   */
  private buildTranslationEntries(
    config: Config,
    sourceFileLoader: SourceFileLoader,
    targetLanguages: LanguagesModel.Language[],
    serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
    output: Output,
    plainView: boolean,
    resolveFileId?: (projectPath: string) => number | undefined,
  ): { entries: TranslationUploadEntry[]; hasErrors: boolean } {
    const entries: TranslationUploadEntry[] = [];
    let hasErrors = false;

    for (const patterns of config.files) {
      const localSourcePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore, {
        languages: targetLanguages,
        serverLanguageMapping,
        fileLanguageMapping: patterns.languages_mapping,
      });

      if (localSourcePaths.length === 0) {
        output.error(
          `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
        );
        continue;
      }

      const commonPath = config.preserveHierarchy ? '' : getCommonPath(localSourcePaths);

      for (const localSourcePath of localSourcePaths) {
        let fileId: number | undefined;

        if (resolveFileId) {
          const projectPath = resolveProjectPath(localSourcePath, patterns, commonPath);
          fileId = resolveFileId(projectPath);

          if (fileId === undefined) {
            // Java treats a source missing from the project as an error and exits non-zero, but
            // keeps the message out of `--plain` so that stream stays parseable.
            if (!plainView) {
              output.error(`Source file '${localSourcePath}' does not exist in the project`);
            }

            hasErrors = true;
            continue;
          }
        }

        const firstLanguage = targetLanguages[0];
        const isMultilingual =
          patterns.scheme !== undefined &&
          firstLanguage !== undefined &&
          !this.translationHasLanguagePlaceholder(patterns.translation);

        if (isMultilingual) {
          const translationPath = stripLeadingSlashes(
            resolveTranslationPath(patterns, localSourcePath, firstLanguage, serverLanguageMapping),
          );
          entries.push({
            translationPath,
            languageIds: targetLanguages.map((language) => language.id),
            languageNames: targetLanguages.map((language) => language.name),
            fileId,
          });
          continue;
        }

        for (const targetLanguage of targetLanguages) {
          const translationPath = stripLeadingSlashes(
            resolveTranslationPath(patterns, localSourcePath, targetLanguage, serverLanguageMapping),
          );
          entries.push({
            translationPath,
            languageIds: [targetLanguage.id],
            languageNames: [targetLanguage.name],
            fileId,
          });
        }
      }
    }

    return { entries, hasErrors };
  }

  private translationHasLanguagePlaceholder(translation: string): boolean {
    return languagePatterns.some((pattern) => translation.includes(pattern));
  }

  /**
   * Java's DryrunTranslations passes filesMustExist=false, so a dry run lists every resolved
   * translation path - including ones with no file on disk yet - de-duplicated.
   */
  private dryRunPaths(entries: TranslationUploadEntry[]): string[] {
    return [...new Set(entries.map((entry) => entry.translationPath))];
  }

  private async uploadTranslationsStringsBased(
    options: UploadTranslationsOptions,
    config: Config,
    output: Output,
    branchService: Awaited<ReturnType<GetBranchService>>,
    storageService: Awaited<ReturnType<GetStorageService>>,
    translationService: Awaited<ReturnType<GetTranslationService>>,
    targetLanguages: LanguagesModel.Language[],
    serverLanguageMapping?: ProjectsGroupsModel.LanguageMapping,
  ) {
    const branch = await branchService.getBranch(options.branch);

    if (!branch) {
      throw new CliError('A branch is required to upload translations for a strings-based project');
    }

    const sourceFileLoader = new SourceFileLoader(config);
    const { entries } = this.buildTranslationEntries(
      config,
      sourceFileLoader,
      targetLanguages,
      serverLanguageMapping,
      output,
      options.output === 'plain',
    );

    // Java DryrunTranslations plain view: bare sorted translation paths, one per line.
    if (options.dryrun && printDryRunPaths(this.dryRunPaths(entries), options, output)) {
      return;
    }

    const tasks = entries.map((entry) => async () => {
      const localFilePath = path.join(config.basePath, entry.translationPath);

      if (!(await Bun.file(localFilePath).exists())) {
        output.warning(`File ${entry.translationPath} does not exist in the specified location`);
        return;
      }

      if (options.dryrun) {
        output.info(`File ${entry.translationPath} would be queued for translations import`);
        return;
      }

      const storage = await storageService.addStorage(Bun.file(localFilePath));

      output.log(this.importingMessage(entry.translationPath));

      await translationService.importProjectTranslationStringsBased(
        storage.data.id,
        branch.id,
        entry.languageIds,
        entry.translationPath,
        options.autoApproveImported,
        options.importEqSuggestions,
        options.translateHidden,
        (status) => output.debug(this.progressMessage(entry.translationPath, status)),
      );

      output.success(`File '${entry.translationPath}'`);
    });

    const results = await runConcurrently(tasks);

    if (reportFailures(results, output)) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  }

  private filterTargetLanguages(
    targetLanguages: LanguagesModel.Language[],
    language?: string,
  ): LanguagesModel.Language[] {
    if (!language) {
      return targetLanguages;
    }

    const filtered = targetLanguages.filter((targetLanguage) => targetLanguage.id === language);

    if (filtered.length === 0) {
      throw new CliError(`Language '${language}' does not exist in the project`);
    }

    return filtered;
  }

  private importingMessage(translationPath: string): string {
    return `Importing translations for file '${translationPath}'`;
  }

  private progressMessage(translationPath: string, status: { progress: number; identifier: string }): string {
    return `Importing translations for file '${translationPath}' (${status.progress}%) (${status.identifier})`;
  }
}
