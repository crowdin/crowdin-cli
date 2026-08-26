import path from 'node:path';
import type { LanguagesModel, SourceFilesModel, SourceStringsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
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
import { isMachineFormat, isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import SourceFileLoader from '@/lib/config/SourceFileLoader.ts';
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
  sameLanguageSet,
} from '@/lib/upload/fileOptions.ts';
import { deleteObsoleteProjectEntries } from '@/lib/upload/obsoleteEntries.ts';
import { computeChecksum, loadSourceCache, saveSourceCache } from '@/lib/upload/sourceCache.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import {
  stripBranchPrefix,
  stripLeadingSlashes,
  toPosixPath,
  toProjectPath,
  toSortedRelativePaths,
} from '@/lib/utils/path.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from './uploadFailures.ts';
import { type UploadedFile, uploadedFileView } from './views.ts';

interface UploadSourcesOptions extends GlobalOptions {
  branch?: string;
  label?: string[];
  deleteObsolete?: boolean;
  // commander maps `--no-auto-update` to `autoUpdate` (defaults to true)
  autoUpdate?: boolean;
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

      if (options.autoUpdate === false) {
        output.warning("'no-auto-update' option can not be used for string-based projects");
      }
    }

    this.validateExcludedTargetLanguages(patternFilePaths, project.data.targetLanguages);

    // Dry-run divergence: Java delegates `--dryrun` to a separate list action; here it is handled
    // inline and reports the concrete would-create/update/delete actions instead of just listing files.
    let branch: SourceFilesModel.Branch | undefined;

    if (options.dryrun) {
      branch = await branchService.getBranch(options.branch);
    } else {
      const resolved = await branchService.getOrCreateBranch(options.branch);
      branch = resolved.branch;

      if (branch) {
        if (resolved.created) {
          output.success(`Branch '${branch.name}'`);
        } else {
          output.warning(`Branch '${branch.name}' already exists in the project`);
        }
      }
    }

    if (isStringsBasedProject && !branch) {
      throw new CliError('A branch is required to upload sources for a strings-based project');
    }

    const branchId = branch?.id;
    const branchName = branch?.name;
    const projectFiles = isStringsBasedProject ? { data: [] } : await fileService.loadProjectFiles(branchId);
    // Server paths carry the branch name; the project paths resolved from the config never do.
    const projectFilePaths = new Map(
      projectFiles.data.map((file) => [stripBranchPrefix(file.data.path, branchName), file.data.id]),
    );
    const projectFileContexts = new Map(projectFiles.data.map((file) => [file.data.id, file.data.context]));
    const projectFileExcludedLanguages = new Map(
      projectFiles.data.map((file) => [file.data.id, file.data.excludedTargetLanguages]),
    );
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
        config.files.map((patterns) => ({
          source: patterns.source,
          translation: patterns.translation,
          ignore: patterns.ignore,
        })),
        config.preserveHierarchy,
        fileService,
        directoryService,
        output,
        Boolean(options.dryrun),
        branchName,
      );
    }

    // A machine --output emits the bare sorted source paths (Java DryrunSources plain view) and wins
    // over --tree; otherwise fall through to the per-file "would be created/updated" messages.
    if (
      options.dryrun &&
      printDryRunPaths(
        toSortedRelativePaths(patternFilePaths.flatMap(({ files }) => files.map(({ localFilePath }) => localFilePath))),
        options,
        output,
      )
    ) {
      return;
    }

    const sourceHashes = options.cache && !options.dryrun ? await loadSourceCache(config.basePath, output) : undefined;
    // Shared per-path promise cache ensures concurrent tasks don't double-create directories
    const directoryCreationPromises = new Map<string, Promise<number>>();
    // Shared cache so files sharing the same customSegmentation reuse the uploaded srx storage id
    const srxStorageIds = new Map<string, Promise<number>>();
    const seenFilePaths = new Set<string>();
    const uploadedSources: UploadedFile[] = [];
    const isPlainView = options.output === 'plain';
    let hasErrors = false;

    for (const { patterns, fileOptions, files } of patternFilePaths) {
      if (files.length === 0) {
        // Java suppresses the message under --plain and returns, so the run exits 0 on a config
        // whose pattern matches nothing. `upload translations` keeps its exit code there and only
        // drops the message, which is the behaviour worth carrying: a plain consumer is a script,
        // and a script that reads success from a broken pattern uploads nothing and says nothing.
        if (!isPlainView) {
          output.error(
            `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
          );
        }

        hasErrors = true;
        continue;
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
          output.warning(`Skipping file '${projectPath}' because it is already uploading/uploaded`);
          uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'already uploading' });
          return;
        }

        seenFilePaths.add(projectPath);

        const localFile = Bun.file(path.join(config.basePath, localFilePath));

        if (localFile.size === 0) {
          output.warning(`File '${projectPath}' was skipped since it is empty`);
          uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'empty' });
          return;
        }

        if (isStringsBasedProject) {
          if (options.dryrun) {
            output.info(`File '${localFilePath}' would be uploaded`);
            return;
          }

          let checksum: string | undefined;

          if (sourceHashes) {
            checksum = await computeChecksum(localFile);

            if (sourceHashes.get(localFilePath) === checksum) {
              output.info(`File '${localFilePath}' was skipped since it is up to date`);
              uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'up to date' });
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

          output.success(`File '${projectPath}'`);
          uploadedSources.push({ path: projectPath, action: 'uploaded' });
          return;
        }

        const readContext = async () => {
          if (!patterns.context) {
            return undefined;
          }

          const contextPath = resolveContextPath(patterns.context, localFilePath);
          return await Bun.file(path.join(config.basePath, contextPath)).text();
        };

        const existingFile = fileLookup(toProjectPath(projectPath), projectFilePaths, expectedProjectFilePaths);

        if (existingFile) {
          if (options.autoUpdate === false) {
            output.info(`File '${localFilePath}' already exists and will not be updated`);
            uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'auto-update disabled' });
            return;
          }

          if (options.dryrun) {
            output.info(`File '${localFilePath}' would be updated`);
            return;
          }

          let checksum: string | undefined;

          if (sourceHashes) {
            checksum = await computeChecksum(localFile);

            if (sourceHashes.get(localFilePath) === checksum) {
              output.info(`File '${localFilePath}' was skipped since it is up to date`);
              uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'up to date' });
              return;
            }
          }

          const srxStorageId = srxStorageIdPromise ? await srxStorageIdPromise : undefined;
          const storage = await storageService.addStorage(localFile);
          const context = await readContext();
          const changedContext =
            context !== undefined && context !== projectFileContexts.get(existingFile.id) ? context : undefined;
          const excludedTargetLanguages = fileOptions.excluded_target_languages;
          const changedExcludedLanguages =
            excludedTargetLanguages !== undefined &&
            !sameLanguageSet(excludedTargetLanguages, projectFileExcludedLanguages.get(existingFile.id))
              ? excludedTargetLanguages
              : undefined;

          try {
            await fileService.updateProjectFile(
              existingFile.id,
              storage.data.id,
              localFilePath,
              buildExportOptions(localFilePath, patterns, patterns.translation),
              buildImportOptions(localFilePath, patterns, srxStorageId),
              patterns.update_option as SourceFilesModel.UpdateOption | undefined,
              labelIds,
              changedExcludedLanguages,
              // On a soft match the project file has a different name/extension; rename it to the source.
              existingFile.exact ? undefined : path.parse(localFilePath).base,
              changedContext,
            );
          } catch (error) {
            if (error instanceof FileInUpdateError) {
              output.warning(`File '${projectPath}' is currently being updated`);
              return;
            }

            throw error;
          }

          if (sourceHashes) {
            sourceHashes.set(localFilePath, checksum as string);
          }

          output.success(`File '${projectPath}'`);
          uploadedSources.push({ path: projectPath, action: 'updated' });
          return;
        }

        const pathDetails = path.parse(projectPath);
        let directoryId: number | undefined;

        if (options.dryrun) {
          output.info(`File '${localFilePath}' would be created`);
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

        const context = await readContext();

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

        output.success(`File '${projectPath}'`);
        uploadedSources.push({ path: projectPath, action: 'created' });
      });

      const results = await runConcurrently(tasks);

      if (reportFailures(results, output)) {
        hasErrors = true;
      }
    }

    if (sourceHashes) {
      await saveSourceCache(config.basePath, sourceHashes, output);
    }

    // Text already streamed a line per file, so only the machine formats need the summary —
    // without it they saw an empty stdout for a command that uploaded real files. Sorted because
    // the uploads run concurrently, and a machine contract should not depend on which finished
    // first. Emitted before the error throw so a partial run still reports what it managed.
    //
    // plain is line-oriented and cannot carry the action, so it lists only what changed — Java
    // prints nothing there for a duplicate or an up-to-date file. (Java does print the empty-file
    // skip under --plain, but that branch simply has no plainView case, like its error handler;
    // an icon'd prose line in a stream of bare paths is the oversight, not the contract.)
    if (isMachineFormat(options.output)) {
      const sorted = uploadedSources.sort((one, other) => one.path.localeCompare(other.path));

      output.list(
        isStructuredFormat(options.output) ? sorted : sorted.filter(({ action }) => action !== 'skipped'),
        uploadedFileView,
      );
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
          // Server paths carry the branch name; the listing shows project paths.
          output.success(`Directory '${stripLeadingSlashes(stripBranchPrefix(directoryPath, branch?.name))}'`);
          return dir.data.id;
        });

      directoryCreationPromises.set(directoryPath, promise);

      directoryId = await promise;
    }

    return directoryId;
  }
}
