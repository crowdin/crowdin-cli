import path from 'node:path';
import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from '@/cli/commands/common/failures.ts';
import { reportNoManagerAccess } from '@/cli/commands/common/managerAccess.ts';
import CliError from '@/cli/errors/CliError.ts';
import WrongLanguageError from '@/cli/errors/WrongLanguageError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { ImportProgress } from '@/cli/services/TranslationService.ts';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetStorageService,
  GetTranslationService,
} from '@/cli/services.ts';
import { isMachineFormat, isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import SourceFileLoader from '@/lib/config/SourceFileLoader.ts';
import { resolveTranslationPath } from '@/lib/config/translationPathResolver.ts';
import { assertFilesConfigured, type Config, isMultilingualFile } from '@/lib/config.ts';
import { containsLanguagePlaceholder } from '@/lib/export/languagePlaceholders.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { isStringsBasedProject } from '@/lib/project/type.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { resolveProjectPath } from '@/lib/upload/fileOptions.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import {
  getCommonPath,
  stripBranchPrefix,
  stripLeadingSlashes,
  toProjectPath,
  toSortedRelativePaths,
} from '@/lib/utils/path.ts';
import { type UploadedFile, uploadedFileView } from './views.ts';

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

interface UploadRun {
  options: UploadTranslationsOptions;
  basePath: string;
  output: Output;
  storageService: StorageService;
}

// Resolves to why the entry was skipped, or to nothing once it is imported.
type ImportEntry = (
  storageId: number,
  entry: TranslationUploadEntry,
  onProgress: ImportProgress,
) => Promise<string | undefined>;

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
      reportNoManagerAccess(output, options.output);
      return;
    }

    const targetLanguages = this.filterTargetLanguages(project.targetLanguages, options.language);
    const serverLanguageMapping = project.languageMapping;
    const run: UploadRun = { options, basePath: config.basePath, output, storageService };
    const importOptions = {
      autoApproveImported: options.autoApproveImported,
      importEqSuggestions: options.importEqSuggestions,
      translateHidden: options.translateHidden,
    };

    if (isStringsBasedProject(project)) {
      const branch = await branchService.getBranch(options.branch);

      if (!branch) {
        throw new CliError('A branch is required to upload translations for a strings-based project');
      }

      const { entries } = this.buildTranslationEntries(config, targetLanguages, serverLanguageMapping, run);

      await this.uploadEntries(run, entries, false, async (storageId, entry, onProgress) => {
        await translationService.importProjectTranslationStringsBased(
          storageId,
          branch.id,
          entry.languageIds,
          entry.translationPath,
          onProgress,
          importOptions,
        );
      });

      return;
    }

    const branch = options.dryrun
      ? await branchService.getBranch(options.branch)
      : (await branchService.getOrCreateBranch(options.branch)).branch;
    const projectFiles = await fileService.loadProjectFiles(branch?.id);
    // Server paths carry the branch name; the project paths resolved from the config never do.
    const projectFilePaths = new Map(projectFiles.map((file) => [stripBranchPrefix(file.path, branch?.name), file.id]));
    const { entries, hasErrors } = this.buildTranslationEntries(
      config,
      targetLanguages,
      serverLanguageMapping,
      run,
      // A dry run resolves translation paths from local sources only; it never looks the source up
      // in the project.
      options.dryrun ? undefined : (projectPath) => fileLookup(toProjectPath(projectPath), projectFilePaths)?.id,
    );

    await this.uploadEntries(run, entries, hasErrors, async (storageId, entry, onProgress) => {
      try {
        await translationService.importProjectTranslation(
          storageId,
          entry.fileId as number,
          entry.languageIds,
          entry.translationPath,
          onProgress,
          importOptions,
        );
      } catch (error) {
        if (error instanceof WrongLanguageError) {
          output.warning(
            `Translation file '${entry.translationPath}' hasn't been uploaded since the following target language(s) ` +
              `are not enabled for the source file in your Crowdin project: ${entry.languageNames.join('/')}`,
          );

          return 'target language not enabled';
        }

        throw error;
      }
    });
  };

  private async uploadEntries(
    { options, basePath, output, storageService }: UploadRun,
    entries: TranslationUploadEntry[],
    entriesHaveErrors: boolean,
    importEntry: ImportEntry,
  ): Promise<void> {
    if (options.dryrun && printDryRunPaths(this.dryRunPaths(entries), options, output)) {
      return;
    }

    // What json/toon report at the end. Text streams per-file messages instead, so it stays empty.
    const uploadedFiles: UploadedFile[] = [];

    const tasks = entries.map((entry) => async () => {
      const localFilePath = path.join(basePath, entry.translationPath);

      if (!(await Bun.file(localFilePath).exists())) {
        output.warning(`File '${entry.translationPath}' does not exist in the specified location`);
        uploadedFiles.push({ path: entry.translationPath, action: 'skipped', reason: 'not found locally' });
        return;
      }

      if (options.dryrun) {
        output.info(`File '${entry.translationPath}' would be queued for translations import`);
        return;
      }

      const storage = await storageService.addStorage(Bun.file(localFilePath));

      output.info(`Importing translations for file '${entry.translationPath}'`);

      const skipReason = await importEntry(storage.id, entry, (status) =>
        output.debug(
          `Importing translations for file '${entry.translationPath}' (${status.progress}%) (${status.identifier})`,
        ),
      );

      if (skipReason) {
        uploadedFiles.push({ path: entry.translationPath, action: 'skipped', reason: skipReason });
        return;
      }

      output.success(`File '${entry.translationPath}'`);
      uploadedFiles.push({ path: entry.translationPath, action: 'uploaded' });
    });

    const results = await runConcurrently(tasks);

    // Text already streamed a line per file, so only the machine formats need the summary.
    // Sorted because the uploads run concurrently, and a machine contract should not depend
    // on which finished first. plain is line-oriented and cannot carry the action, so it
    // lists only what was uploaded.
    if (isMachineFormat(options.output)) {
      const sorted = uploadedFiles.sort((one, other) => one.path.localeCompare(other.path));

      output.list(
        isStructuredFormat(options.output) ? sorted : sorted.filter(({ action }) => action !== 'skipped'),
        uploadedFileView,
      );
    }

    // A dry run only previews, so it never fails the process.
    const failed = reportFailures(results, output);
    if (!options.dryrun && (failed || entriesHaveErrors)) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  }

  /**
   * Builds the list of translation uploads from local source files: sources are resolved to project
   * paths (honoring dest / preserve_hierarchy / ignore), and each source expands to one entry per
   * target language — or a single multi-language entry for a multilingual file (a `scheme` or
   * `multilingual: true`) whose translation pattern has no language placeholder.
   */
  private buildTranslationEntries(
    config: Config,
    targetLanguages: LanguagesModel.Language[],
    serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
    { options, output }: UploadRun,
    resolveFileId?: (projectPath: string) => number | undefined,
  ): { entries: TranslationUploadEntry[]; hasErrors: boolean } {
    const sourceFileLoader = new SourceFileLoader(config);
    const plainView = options.output === 'plain';
    const entries: TranslationUploadEntry[] = [];
    let hasErrors = false;

    for (const patterns of config.files) {
      const localSourcePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore, {
        languages: targetLanguages,
        serverLanguageMapping,
        fileLanguageMapping: patterns.languages_mapping,
      });

      // An empty group is reported and skipped without failing the run; the message stays out of
      // `--plain` so that stream stays parseable.
      if (localSourcePaths.length === 0) {
        if (!plainView) {
          output.error(
            `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
          );
        }

        continue;
      }

      const commonPath = config.preserveHierarchy ? '' : getCommonPath(localSourcePaths);

      for (const localSourcePath of localSourcePaths) {
        let fileId: number | undefined;

        if (resolveFileId) {
          const projectPath = resolveProjectPath(localSourcePath, patterns, commonPath);
          fileId = resolveFileId(projectPath);

          if (fileId === undefined) {
            // A source missing from the project fails the run, but the message stays out of
            // `--plain` so that stream stays parseable.
            if (!plainView) {
              output.error(`Source file '${localSourcePath}' does not exist in the project`);
            }

            hasErrors = true;
            continue;
          }
        }

        const firstLanguage = targetLanguages[0];
        const isMultilingual =
          isMultilingualFile(patterns) &&
          firstLanguage !== undefined &&
          !containsLanguagePlaceholder(patterns.translation);

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

  /**
   * A dry run lists every resolved translation path, including ones with no file on disk yet,
   * de-duplicated.
   */
  private dryRunPaths(entries: TranslationUploadEntry[]): string[] {
    return toSortedRelativePaths([...new Set(entries.map((entry) => entry.translationPath))]);
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
}
