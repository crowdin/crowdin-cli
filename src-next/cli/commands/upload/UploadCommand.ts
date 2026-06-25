import path from 'node:path';
import type { LanguagesModel, ResponseObject, SourceFilesModel, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import { FileExistsError, FileInUpdateError } from '@/cli/services/FileService.ts';
import { WrongLanguageError } from '@/cli/services/TranslationService.ts';
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
import { fileTree } from '@/cli/utils/fileTree.ts';
import type { Output } from '@/cli/utils/output.ts';
import { isPathMatch } from '@/cli/utils/pathMatcher.ts';
import SourceFileLoader from '@/lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '@/lib/config/translationPathResolver.ts';
import type { Config } from '@/lib/config.ts';
import { languagePatterns } from '@/lib/export/patterns.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import {
  buildExportOptions,
  buildImportOptions,
  buildStringsImportOptions,
  getCommonPath,
  prepareDest,
  resolveContextPath,
} from '@/lib/upload/fileOptions.ts';
import { pollUntilFinished } from '@/lib/upload/pollUpload.ts';
import { computeChecksum, loadSourceCache, saveSourceCache } from '@/lib/upload/sourceCache.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
import { filesConfigGroup } from '../common/options/configGroups.ts';
import dryRun from '../common/options/dryRun.ts';
import tree from '../common/options/tree.ts';
import autoApproveImported from './options/autoApproveImported.ts';
import branch from './options/branch.ts';
import cache from './options/cache.ts';
import deleteObsolete from './options/deleteObsolete.ts';
import excludedLanguage from './options/excludedLanguage.ts';
import importEqSuggestions from './options/importEqSuggestions.ts';
import label from './options/label.ts';
import language from './options/language.ts';
import noAutoUpdate from './options/noAutoUpdate.ts';
import translateHidden from './options/translateHidden.ts';

interface UploadSourcesOptions {
  branch?: string;
  label?: string[];
  deleteObsolete?: boolean;
  noAutoUpdate?: boolean;
  excludedLanguage?: string[];
  dryrun?: boolean;
  tree?: boolean;
  cache?: boolean;
}

interface UploadTranslationsOptions {
  branch?: string;
  language?: string;
  autoApproveImported?: boolean;
  importEqSuggestions?: boolean;
  translateHidden?: boolean;
  dryrun?: boolean;
  tree?: boolean;
}

interface SourceFileOptions {
  labels?: string[];
  excluded_target_languages?: string[];
}

interface TranslationUploadEntry {
  translationPath: string;
  languageIds: string[];
  languageNames: string[];
  fileId?: number;
}

// Java's UploadSources/UploadTranslations actions run every file, then fail with this generic
// message if any individual upload errored (error.execution_contains_errors).
const EXECUTION_FINISHED_WITH_ERRORS = 'Current execution finished with errors';

export default class UploadCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getBranchService: GetBranchService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
    private getTranslationService: GetTranslationService,
    private getStringService: GetStringService,
  ) {}

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
          action: this.uploadSourcesAction,
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
          action: this.uploadTranslationsAction,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.uploadSourcesAction(command);
  };

  uploadSourcesAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadSourcesOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const branchService = await this.getBranchService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const stringService = await this.getStringService(command);
    const project = await projectService.loadProject();
    const isStringsBasedProject = project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const sourceFileLoader = new SourceFileLoader(config);
    const patternFilePaths = config.files.map((patterns) => {
      const localFilePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore);
      const commonPath = config.preserveHierarchy ? '' : getCommonPath(localFilePaths);

      return {
        patterns,
        fileOptions: this.resolveSourceFileOptions(patterns, options),
        files: localFilePaths.map((localFilePath) => ({
          localFilePath,
          projectPath: this.resolveProjectPath(localFilePath, patterns, commonPath),
        })),
      };
    });
    const containsExcludedLanguages = patternFilePaths.some(
      ({ fileOptions }) => (fileOptions.excluded_target_languages?.length ?? 0) > 0,
    );

    // Java warns and exits 0 by default; its non-zero exit only happened under the removed `--plain`
    // flag, so this matches Java's default behavior.
    if (!this.isManagerAccess(project) && (containsExcludedLanguages || options.deleteObsolete)) {
      output.warning(
        "You must have manager or developer role in the project to apply 'excluded-languages' or/and 'delete-obsolete' options",
      );
      return;
    }

    this.validateExcludedTargetLanguages(patternFilePaths, project.data.targetLanguages);

    // Dry-run divergence: Java delegates `--dryrun` to a separate list action; here it is handled
    // inline and reports the concrete would-create/update/delete actions instead of just listing files.
    const branch = options.dryrun
      ? await branchService.getBranch(options.branch)
      : await branchService.getOrCreateBranch(options.branch);

    if (isStringsBasedProject && !branch) {
      throw new CliError('A branch is required to upload sources for a strings-based project');
    }

    const branchId = branch?.id;
    const projectFiles = isStringsBasedProject ? { data: [] } : await fileService.loadProjectFiles(branchId);
    const projectFilePaths = new Map(projectFiles.data.map((file) => [file.data.path, file.data.id]));
    const projectDirectoryList = isStringsBasedProject ? [] : await directoryService.loadProjectDirectories(branchId);
    const projectDirectories = new Map(
      projectDirectoryList.map((directory) => [directory.data.path, directory.data.id]),
    );
    const expectedProjectFilePaths = new Set(
      patternFilePaths.flatMap(({ files }) => files.map(({ projectPath }) => this.toProjectPath(projectPath))),
    );

    if (options.deleteObsolete && !isStringsBasedProject) {
      await this.deleteObsoleteProjectEntries(
        projectFiles.data,
        projectDirectoryList,
        expectedProjectFilePaths,
        config.files.map((patterns) => ({ source: patterns.source, ignore: patterns.ignore })),
        config.preserveHierarchy,
        fileService,
        directoryService,
        output,
        Boolean(options.dryrun),
      );
    }

    if (options.dryrun && options.tree) {
      const allPaths = patternFilePaths.flatMap(({ files }) => files.map(({ localFilePath }) => localFilePath));

      for (const line of fileTree(allPaths)) {
        output.log(line);
      }

      return;
    }

    const sourceHashes = options.cache && !options.dryrun ? await loadSourceCache(config.basePath, output) : undefined;

    // Shared per-path promise cache ensures concurrent tasks don't double-create directories
    const directoryCreationPromises = new Map<string, Promise<number>>();
    // Shared cache so files sharing the same customSegmentation reuse the uploaded srx storage id
    const srxStorageIds = new Map<string, Promise<number>>();
    const seenFilePaths = new Set<string>();
    let hasErrors = false;

    for (const { patterns, fileOptions, files } of patternFilePaths) {
      if (files.length === 0) {
        throw new CliError(
          `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
        );
      }

      if (isStringsBasedProject && patterns.context) {
        output.warning('Context can not be used for string-based projects');
      }

      const labelIds =
        fileOptions.labels !== undefined ? await labelService.resolveLabelIds(fileOptions.labels) : undefined;

      let srxStorageIdPromise: Promise<number> | undefined;

      // Strings-based import options ignore srxStorageId, so skip uploading the srx storage there.
      if (patterns.custom_segmentation && !options.dryrun && !isStringsBasedProject) {
        if (!srxStorageIds.has(patterns.custom_segmentation)) {
          srxStorageIds.set(
            patterns.custom_segmentation,
            storageService
              .addStorage(Bun.file(path.join(config.basePath, patterns.custom_segmentation)))
              .then((storage) => storage.data.id),
          );
        }

        srxStorageIdPromise = srxStorageIds.get(patterns.custom_segmentation);
      }

      const tasks = files.map(({ localFilePath, projectPath }) => async () => {
        if (seenFilePaths.has(projectPath)) {
          output.warning(`Skipping file '${localFilePath}' because it is already uploading/uploaded`);
          return;
        }

        seenFilePaths.add(projectPath);

        const localFile = Bun.file(path.join(config.basePath, localFilePath));

        if (localFile.size === 0) {
          output.warning(`File '${localFilePath}' was skipped since it is empty`);
          return;
        }

        if (isStringsBasedProject) {
          if (options.dryrun) {
            output.info(`File ${localFilePath} would be uploaded`);
            return;
          }

          let checksum: string | undefined;

          if (sourceHashes) {
            checksum = await computeChecksum(localFile);

            if (sourceHashes.get(localFilePath) === checksum) {
              output.info(`File '${localFilePath}' was skipped since it is up to date`);
              return;
            }
          }

          const storage = await storageService.addStorage(localFile);
          const uploadResponse = await stringService.uploadStrings({
            branchId: (branch as SourceFilesModel.Branch).id,
            storageId: storage.data.id,
            type: patterns.type as SourceStringsModel.UploadStringsType | undefined,
            labelIds,
            importOptions: buildStringsImportOptions(localFilePath, patterns),
          });

          await pollUntilFinished(
            uploadResponse,
            (uploadId) => stringService.getUploadStringsStatus(uploadId),
            `Failed to upload strings for file ${localFilePath}`,
          );

          if (sourceHashes) {
            sourceHashes.set(localFilePath, checksum ?? (await computeChecksum(localFile)));
          }

          output.success(`File '${localFilePath}'`);
          return;
        }

        const existingFile = fileLookup(`/${projectPath}`, projectFilePaths);

        if (existingFile) {
          if (options.noAutoUpdate) {
            output.info(`File ${localFilePath} already exists and will not be updated`);
            return;
          }

          if (options.dryrun) {
            output.info(`File ${localFilePath} would be updated`);
            return;
          }

          let checksum: string | undefined;

          if (sourceHashes) {
            checksum = await computeChecksum(localFile);

            if (sourceHashes.get(localFilePath) === checksum) {
              output.info(`File '${localFilePath}' was skipped since it is up to date`);
              return;
            }
          }

          const srxStorageId = srxStorageIdPromise ? await srxStorageIdPromise : undefined;
          const storage = await storageService.addStorage(localFile);

          try {
            await fileService.updateProjectFile(
              existingFile.id,
              storage.data.id,
              localFilePath,
              buildExportOptions(localFilePath, patterns, patterns.translation),
              buildImportOptions(localFilePath, patterns, srxStorageId),
              patterns.update_option as SourceFilesModel.UpdateOption | undefined,
              labelIds,
              fileOptions.excluded_target_languages,
              // On a soft match the project file has a different name/extension; rename it to the source.
              existingFile.exact ? undefined : path.parse(localFilePath).base,
            );
          } catch (error) {
            if (error instanceof FileInUpdateError) {
              output.warning(`File '${localFilePath}' is currently being updated`);
              return;
            }

            throw error;
          }

          if (sourceHashes) {
            sourceHashes.set(localFilePath, checksum as string);
          }

          output.success(`File '${localFilePath}'`);
          return;
        }

        const pathDetails = path.parse(projectPath);
        let directoryId: number | undefined;

        if (options.dryrun) {
          output.info(`File ${localFilePath} would be created`);
          return;
        }

        const srxStorageId = srxStorageIdPromise ? await srxStorageIdPromise : undefined;
        const storage = await storageService.addStorage(localFile);

        if (pathDetails.dir !== '') {
          directoryId = await this.addProjectDirectories(
            pathDetails,
            projectDirectories,
            directoryCreationPromises,
            directoryService,
            output,
            branch,
          );
        }

        let context: string | undefined;

        if (patterns.context) {
          const contextPath = resolveContextPath(patterns.context, localFilePath);
          context = await Bun.file(path.join(config.basePath, contextPath)).text();
        }

        try {
          await fileService.createProjectFile({
            storageId: storage.data.id,
            name: pathDetails.base,
            directoryId,
            branchId,
            context,
            exportOptions: buildExportOptions(localFilePath, patterns, patterns.translation),
            importOptions: buildImportOptions(localFilePath, patterns, srxStorageId),
            type: patterns.type as SourceFilesModel.FileType | undefined,
            excludedTargetLanguages: fileOptions.excluded_target_languages,
            attachLabelIds: labelIds,
          });
        } catch (error) {
          if (error instanceof FileExistsError) {
            throw new CliError(`Project already contains the file '${projectPath}'`);
          }

          throw error;
        }

        if (sourceHashes) {
          sourceHashes.set(localFilePath, await computeChecksum(localFile));
        }

        output.success(`File '${localFilePath}'`);
      });

      const results = await runConcurrently(tasks);

      if (this.reportFailures(results, output)) {
        hasErrors = true;
      }
    }

    if (sourceHashes) {
      await saveSourceCache(config.basePath, sourceHashes, output);
    }

    if (hasErrors) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  };

  private async deleteObsoleteProjectEntries(
    projectFiles: ResponseObject<SourceFilesModel.File>[],
    projectDirectories: ResponseObject<SourceFilesModel.Directory>[],
    expectedProjectFilePaths: Set<string>,
    sourcePatterns: { source: string; ignore?: string[] }[],
    preserveHierarchy: boolean,
    fileService: Awaited<ReturnType<GetFileService>>,
    directoryService: Awaited<ReturnType<GetDirectoryService>>,
    output: Output,
    dryRun: boolean,
  ) {
    // Retain every project file the upload would match — including soft (extension-insensitive)
    // matches — so a file that will be updated/renamed is never deleted as obsolete first.
    const projectFilesByPath = new Map(
      projectFiles.map((projectFile) => [this.toProjectPath(projectFile.data.path), projectFile.data.id]),
    );
    const retainedFileIds = new Set<number>();

    for (const expectedPath of expectedProjectFilePaths) {
      const match = fileLookup(expectedPath, projectFilesByPath);

      if (match) {
        retainedFileIds.add(match.id);
      }
    }

    // Only delete files that fall under a configured `source` pattern (and aren't ignored). This
    // scopes deletion to files this config manages, mirroring Java's ObsoleteSourcesUtils — files
    // outside every source pattern are left untouched.
    const obsoleteFiles = projectFiles.filter(
      (projectFile) =>
        !retainedFileIds.has(projectFile.data.id) &&
        this.isManagedBySourcePatterns(this.toProjectPath(projectFile.data.path), sourcePatterns, preserveHierarchy),
    );

    for (const projectFile of obsoleteFiles) {
      const projectFilePath = this.toProjectPath(projectFile.data.path);

      if (dryRun) {
        output.info(`File ${projectFilePath} would be deleted as obsolete`);
      } else {
        await fileService.deleteProjectFile(projectFile.data.id, projectFilePath);
        output.success(`File ${projectFilePath} deleted as obsolete`);
      }
    }

    const remainingProjectFilePaths = new Set([
      ...projectFiles
        .filter((projectFile) => !obsoleteFiles.includes(projectFile))
        .map((projectFile) => this.toProjectPath(projectFile.data.path)),
      ...expectedProjectFilePaths,
    ]);
    const obsoleteDirectories = projectDirectories
      .filter(
        (directory) => !this.hasFileUnderDirectory(remainingProjectFilePaths, this.toProjectPath(directory.data.path)),
      )
      .sort((left, right) => right.data.path.length - left.data.path.length);

    for (const directory of obsoleteDirectories) {
      const directoryPath = this.toProjectPath(directory.data.path);

      if (dryRun) {
        output.info(`Directory ${directoryPath} would be deleted as obsolete`);
      } else {
        await directoryService.deleteProjectDirectory(directory.data.id, directoryPath);
        output.success(`Directory ${directoryPath} deleted as obsolete`);
      }
    }
  }

  /**
   * Whether a project file path is covered by any configured `source` pattern (and not ignored).
   * With `preserve_hierarchy` the project path keeps its full hierarchy, so it is matched directly.
   * Without it, project paths have their common prefix stripped, so the path is matched against every
   * trailing slice of the source pattern (leading directories optional) — an approximation of Java's
   * ObsoleteSourcesUtils regex with optional leading segments.
   */
  private isManagedBySourcePatterns(
    projectPath: string,
    sourcePatterns: { source: string; ignore?: string[] }[],
    preserveHierarchy: boolean,
  ): boolean {
    return sourcePatterns.some(({ source, ignore }) => {
      if (!this.matchesPattern(projectPath, source, preserveHierarchy)) {
        return false;
      }

      return !(ignore ?? []).some((ignorePattern) =>
        this.matchesPattern(projectPath, ignorePattern, preserveHierarchy),
      );
    });
  }

  private matchesPattern(projectPath: string, pattern: string, preserveHierarchy: boolean): boolean {
    if (preserveHierarchy) {
      return isPathMatch(projectPath, pattern);
    }

    const segments = (pattern.startsWith('/') ? pattern.slice(1) : pattern).split('/');

    for (let index = 0; index < segments.length; index++) {
      if (isPathMatch(projectPath, `/${segments.slice(index).join('/')}`)) {
        return true;
      }
    }

    return false;
  }

  private hasFileUnderDirectory(filePaths: Set<string>, directoryPath: string): boolean {
    const normalizedDirectoryPath = this.toProjectPath(directoryPath);
    const prefix = normalizedDirectoryPath.endsWith('/') ? normalizedDirectoryPath : `${normalizedDirectoryPath}/`;

    for (const filePath of filePaths) {
      if (this.toProjectPath(filePath).startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  private toProjectPath(filePath: string): string {
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  }

  /**
   * Reports each rejected task (so per-file failures are visible) and returns whether any failed.
   * Mirrors Java, which keeps processing every file and only aggregates the failure at the end.
   */
  private reportFailures(results: PromiseSettledResult<unknown>[], output: Output): boolean {
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    for (const failure of failures) {
      output.error(failure.reason instanceof Error ? failure.reason.message : String(failure.reason));
    }

    return failures.length > 0;
  }

  /**
   * Maps a local source path to its path inside the Crowdin project, mirroring Java's
   * UploadSourcesAction: an explicit `dest` wins, otherwise the common path is stripped unless
   * `preserve_hierarchy` is enabled (in which case `commonPath` is empty).
   */
  private resolveProjectPath(localFilePath: string, patterns: { dest?: string }, commonPath: string): string {
    if (patterns.dest) {
      return prepareDest(patterns.dest, localFilePath);
    }

    if (commonPath && localFilePath.startsWith(commonPath)) {
      return localFilePath.slice(commonPath.length);
    }

    return localFilePath;
  }

  private isManagerAccess(
    project: ResponseObject<ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings>,
  ): boolean {
    return 'languageMapping' in project.data;
  }

  private validateExcludedTargetLanguages(
    patternFilePaths: { fileOptions: SourceFileOptions }[],
    targetLanguages: LanguagesModel.Language[],
  ) {
    const validLanguageIds = new Set(targetLanguages.map((language) => language.id));
    const unknownLanguageIds = new Set<string>();

    for (const { fileOptions } of patternFilePaths) {
      for (const languageId of fileOptions.excluded_target_languages ?? []) {
        if (!validLanguageIds.has(languageId)) {
          unknownLanguageIds.add(languageId);
        }
      }
    }

    if (unknownLanguageIds.size > 0) {
      throw new CliError(`Project doesn't have '${Array.from(unknownLanguageIds).join("', '")}' language(s)`);
    }
  }

  private resolveSourceFileOptions(patterns: SourceFileOptions, options: UploadSourcesOptions): SourceFileOptions {
    return {
      labels: this.mergeStringOptions(patterns.labels, options.label),
      excluded_target_languages: this.mergeStringOptions(patterns.excluded_target_languages, options.excludedLanguage),
    };
  }

  private mergeStringOptions(configValues?: string[], optionValues?: string | string[]): string[] | undefined {
    const values = [...(configValues ?? []), ...this.normalizeStringOption(optionValues)];
    return values.length > 0 ? Array.from(new Set(values)) : undefined;
  }

  private normalizeStringOption(optionValue?: string | string[]): string[] {
    if (optionValue === undefined || optionValue === '') {
      return [];
    }

    return Array.isArray(optionValue) ? optionValue : [optionValue];
  }

  private async addProjectDirectories(
    pathDetails: ReturnType<typeof path.parse>,
    projectDirectories: Map<string, number>,
    directoryCreationPromises: Map<string, Promise<number>>,
    directoryService: DirectoryService,
    output: Output,
    branch?: SourceFilesModel.Branch,
  ) {
    const directories = toPosixPath(pathDetails.dir).split('/');
    let directoryId: number | undefined;

    for (let index = 0; index < directories.length; index++) {
      const directoryName = directories[index] as string;
      const directoryPath = `${branch ? `/${branch.name}` : ''}/${directories.slice(0, index + 1).join('/')}`;

      // Check promise cache first (set atomically before any await, safe for concurrent callers)
      if (directoryCreationPromises.has(directoryPath)) {
        directoryId = await directoryCreationPromises.get(directoryPath);
        continue;
      }

      if (projectDirectories.has(directoryPath)) {
        directoryId = projectDirectories.get(directoryPath);
        continue;
      }

      const parentId = directoryId;
      // Store promise synchronously before awaiting so concurrent tasks reuse it
      const promise = directoryService
        .createProjectDirectory(directoryName, parentId, parentId ? undefined : branch?.id)
        .then((dir) => {
          projectDirectories.set(dir.data.path, dir.data.id);
          output.success(`Directory ${directoryName} created`);
          return dir.data.id;
        });

      directoryCreationPromises.set(directoryPath, promise);

      directoryId = await promise;
    }

    return directoryId;
  }

  uploadTranslationsAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadTranslationsOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const translationService = await this.getTranslationService(command);
    const translationPathResolver = new TranslationPathResolver(config);
    const project = await projectService.loadProject();

    if (!this.isManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    const targetLanguages = this.filterTargetLanguages(project.data.targetLanguages, options.language);
    const serverLanguageMapping = 'languageMapping' in project.data ? project.data.languageMapping : undefined;

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      await this.uploadTranslationsStringsBased(
        options,
        config,
        output,
        branchService,
        storageService,
        translationService,
        translationPathResolver,
        targetLanguages,
        serverLanguageMapping,
      );
      return;
    }

    const branch = options.dryrun
      ? await branchService.getBranch(options.branch)
      : await branchService.getOrCreateBranch(options.branch);
    const branchId = branch?.id;
    const projectFiles = await fileService.loadProjectFiles(branchId);
    const projectFilePaths = new Map(projectFiles.data.map((file) => [file.data.path, file.data.id]));
    const sourceFileLoader = new SourceFileLoader(config);

    const { entries, hasErrors: entriesHaveErrors } = this.buildTranslationEntries(
      config,
      sourceFileLoader,
      translationPathResolver,
      targetLanguages,
      serverLanguageMapping,
      output,
      (projectPath) => fileLookup(this.toProjectPath(projectPath), projectFilePaths)?.id,
    );

    if (options.dryrun && options.tree) {
      const allPaths: string[] = [];

      for (const entry of entries) {
        if (await Bun.file(path.join(config.basePath, entry.translationPath)).exists()) {
          allPaths.push(entry.translationPath);
        }
      }

      for (const line of fileTree(allPaths)) {
        output.log(line);
      }

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
        await translationService.importProjectTranslation(
          storage.data.id,
          entry.fileId as number,
          entry.languageIds,
          entry.translationPath,
          options.autoApproveImported,
          options.importEqSuggestions,
          options.translateHidden,
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

      output.success(`File ${entry.translationPath} was queued for translations import`);
    });

    const results = await runConcurrently(tasks);

    // A dry run only previews; like Java's separate list action it never fails the process.
    const failed = this.reportFailures(results, output);
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
    translationPathResolver: TranslationPathResolver,
    targetLanguages: LanguagesModel.Language[],
    serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
    output: Output,
    resolveFileId?: (projectPath: string) => number | undefined,
  ): { entries: TranslationUploadEntry[]; hasErrors: boolean } {
    const entries: TranslationUploadEntry[] = [];
    let hasErrors = false;

    for (const patterns of config.files) {
      const localSourcePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore);

      if (localSourcePaths.length === 0) {
        output.error(
          `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
        );
        continue;
      }

      const commonPath = config.preserveHierarchy ? '' : getCommonPath(localSourcePaths);

      for (const localSourcePath of localSourcePaths) {
        const sourceFile = Bun.file(localSourcePath);

        if (!translationPathResolver.canResolve(sourceFile)) {
          continue;
        }

        let fileId: number | undefined;

        if (resolveFileId) {
          const projectPath = this.resolveProjectPath(localSourcePath, patterns, commonPath);
          fileId = resolveFileId(projectPath);

          if (fileId === undefined) {
            // Java treats a source missing from the project as an error and exits non-zero.
            output.error(`Source file '${localSourcePath}' does not exist in the project`);
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
          const translationPath = translationPathResolver
            .resolve(sourceFile, firstLanguage, serverLanguageMapping)
            .slice(1);
          entries.push({
            translationPath,
            languageIds: targetLanguages.map((language) => language.id),
            languageNames: targetLanguages.map((language) => language.name),
            fileId,
          });
          continue;
        }

        for (const targetLanguage of targetLanguages) {
          const translationPath = translationPathResolver
            .resolve(sourceFile, targetLanguage, serverLanguageMapping)
            .slice(1);
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

  private async uploadTranslationsStringsBased(
    options: UploadTranslationsOptions,
    config: Config,
    output: Output,
    branchService: Awaited<ReturnType<GetBranchService>>,
    storageService: Awaited<ReturnType<GetStorageService>>,
    translationService: Awaited<ReturnType<GetTranslationService>>,
    translationPathResolver: TranslationPathResolver,
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
      translationPathResolver,
      targetLanguages,
      serverLanguageMapping,
      output,
    );

    if (options.dryrun && options.tree) {
      const allPaths: string[] = [];

      for (const entry of entries) {
        if (await Bun.file(path.join(config.basePath, entry.translationPath)).exists()) {
          allPaths.push(entry.translationPath);
        }
      }

      for (const line of fileTree(allPaths)) {
        output.log(line);
      }

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
      const importResponse = await translationService.importProjectTranslationStringsBased(
        storage.data.id,
        branch.id,
        entry.languageIds,
        entry.translationPath,
        options.autoApproveImported,
        options.importEqSuggestions,
        options.translateHidden,
      );

      await pollUntilFinished(
        importResponse,
        (importId) => translationService.getImportTranslationsStatus(importId),
        `Failed to import translations for file ${entry.translationPath}`,
      );

      output.success(`File ${entry.translationPath} was queued for translations import`);
    });

    const results = await runConcurrently(tasks);

    if (this.reportFailures(results, output)) {
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
}
