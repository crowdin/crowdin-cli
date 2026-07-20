import path from 'node:path';
import type { LanguagesModel, SourceFilesModel, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import FileExistsError from '@/cli/errors/FileExistsError.ts';
import FileInUpdateError from '@/cli/errors/FileInUpdateError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
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
} from '@/cli/services.ts';
import { printFileTree } from '@/cli/utils/fileTree.ts';
import { OUTPUT_FORMATS, type Output } from '@/cli/utils/output.ts';
import SourceFileLoader from '@/lib/config/sourceFileLoader.ts';
import { assertFilesConfigured } from '@/lib/config.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import {
  buildExportOptions,
  buildImportOptions,
  buildStringsImportOptions,
  getCommonPath,
  resolveContextPath,
  resolveProjectPath,
} from '@/lib/upload/fileOptions.ts';
import { deleteObsoleteProjectEntries } from '@/lib/upload/obsoleteEntries.ts';
import { computeChecksum, loadSourceCache, saveSourceCache } from '@/lib/upload/sourceCache.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import { toPosixPath, toProjectPath, toSortedRelativePaths } from '@/lib/utils/path.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from './uploadFailures.ts';

interface UploadSourcesOptions extends GlobalOptions {
  branch?: string;
  label?: string[];
  deleteObsolete?: boolean;
  noAutoUpdate?: boolean;
  excludedLanguage?: string[];
  dryrun?: boolean;
  tree?: boolean;
  cache?: boolean;
}

interface SourceFileOptions {
  labels?: string[];
  excluded_target_languages?: string[];
}

export default class UploadSourcesCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getBranchService: GetBranchService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
    private getStringService: GetStringService,
  ) {}

  action = async (command: Command) => {
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

    assertFilesConfigured(config);

    const project = await projectService.loadProject();
    const isStringsBasedProject = project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const serverLanguageMapping = hasManagerAccess(project) ? project.data.languageMapping : undefined;
    const sourceFileLoader = new SourceFileLoader(config);
    const patternFilePaths = config.files.map((patterns) => {
      const localFilePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore, {
        languages: project.data.targetLanguages,
        serverLanguageMapping,
        fileLanguageMapping: patterns.languages_mapping,
      });
      const commonPath = config.preserveHierarchy ? '' : getCommonPath(localFilePaths);

      return {
        patterns,
        fileOptions: this.resolveSourceFileOptions(patterns, options),
        files: localFilePaths.map((localFilePath) => ({
          localFilePath,
          projectPath: resolveProjectPath(localFilePath, patterns, commonPath),
        })),
      };
    });
    const containsExcludedLanguages = patternFilePaths.some(
      ({ fileOptions }) => (fileOptions.excluded_target_languages?.length ?? 0) > 0,
    );

    // Java warns and exits 0 by default; its non-zero exit only happened under the removed `--plain`
    // flag, so this matches Java's default behavior.
    if (!hasManagerAccess(project) && (containsExcludedLanguages || options.deleteObsolete)) {
      output.warning(
        "You must have manager or developer role in the project to apply 'excluded-languages' or/and 'delete-obsolete' options",
      );
      return;
    }

    // These options have no effect on strings-based projects (the strings upload request ignores
    // them), so warn instead of silently doing nothing. Mirrors the existing `context` warning.
    if (isStringsBasedProject) {
      if (containsExcludedLanguages) {
        output.warning("'excluded-languages' option can not be used for string-based projects");
      }

      if (options.deleteObsolete) {
        output.warning("'delete-obsolete' option can not be used for string-based projects");
      }

      if (options.noAutoUpdate) {
        output.warning("'no-auto-update' option can not be used for string-based projects");
      }
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
      patternFilePaths.flatMap(({ files }) => files.map(({ projectPath }) => toProjectPath(projectPath))),
    );

    if (options.deleteObsolete && !isStringsBasedProject) {
      await deleteObsoleteProjectEntries(
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

    // Tree is interactive-only; a machine --output (json/toon/plain) is a parseable contract and wins.
    if (options.dryrun && options.tree && !OUTPUT_FORMATS.includes(options.output ?? '')) {
      printFileTree(
        patternFilePaths.flatMap(({ files }) => files.map(({ localFilePath }) => localFilePath)),
        output,
      );

      return;
    }

    // Machine formats emit the bare sorted source paths (Java DryrunSources plain view); output.table
    // serializes per format so json/toon/plain all stay parseable instead of the per-file messages.
    if (options.dryrun && OUTPUT_FORMATS.includes(options.output ?? '')) {
      const paths = toSortedRelativePaths(
        patternFilePaths.flatMap(({ files }) => files.map(({ localFilePath }) => localFilePath)),
      );

      output.table(paths);
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

          await stringService.uploadStrings(
            {
              branchId: (branch as SourceFilesModel.Branch).id,
              storageId: storage.data.id,
              type: patterns.type as SourceStringsModel.UploadStringsType | undefined,
              labelIds,
              importOptions: buildStringsImportOptions(localFilePath, patterns),
            },
            localFilePath,
          );

          if (sourceHashes) {
            sourceHashes.set(localFilePath, checksum ?? (await computeChecksum(localFile)));
          }

          output.success(`File '${localFilePath}'`);
          return;
        }

        const existingFile = fileLookup(`/${projectPath}`, projectFilePaths, expectedProjectFilePaths);

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

      if (reportFailures(results, output)) {
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
}
