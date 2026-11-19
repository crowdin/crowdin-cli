import path from 'node:path';
import type {
  LanguagesModel,
  ProjectsGroupsModel,
  SourceFilesModel,
  SourceStringsModel,
} from '@crowdin/crowdin-api-client';
import type { BunFile } from 'bun';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from '@/cli/commands/common/failures.ts';
import { reportNoManagerAccess } from '@/cli/commands/common/managerAccess.ts';
import CliError from '@/cli/errors/CliError.ts';
import FileExistsError from '@/cli/errors/FileExistsError.ts';
import FileInUpdateError from '@/cli/errors/FileInUpdateError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/file/FileService.ts';
import { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';
import type { StorageService } from '@/cli/services/StorageService.ts';
import type { StringService } from '@/cli/services/StringService.ts';
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
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { isStringsBasedProject } from '@/lib/project/type.ts';
import {
  buildExportOptions,
  buildImportOptions,
  buildStringsImportOptions,
  changedFileSettings,
  replaceFileDependentPlaceholders,
  resolveProjectPath,
} from '@/lib/upload/fileOptions.ts';
import { computeChecksum, loadSourceCache, saveSourceCache } from '@/lib/upload/sourceCache.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import {
  getCommonPath,
  stripBranchPrefix,
  stripLeadingSlashes,
  toPosixPath,
  toSortedRelativePaths,
} from '@/lib/utils/path.ts';
import {
  type PlannedFile,
  type SkipReason,
  type SourceFileOptions,
  type SourcePaths,
  type UploadSourcesPlan,
  UploadSourcesPlanner,
} from './UploadSourcesPlanner.ts';
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

interface SourceGroup {
  patterns: Config['files'][number];
  fileOptions: SourceFileOptions;
  labelIds: number[] | undefined;
  srxStorageIdPromise: Promise<number> | undefined;
}

interface SourceUpload extends SourceGroup, SourcePaths {
  localFile: BunFile;
}

// What every concurrent upload of one run shares.
interface UploadRun {
  options: UploadSourcesOptions;
  basePath: string;
  output: Output;
  storageService: StorageService;
  directoryService: DirectoryService;
  fileService: FileService;
  stringService: StringService;
  branch: SourceFilesModel.Branch | undefined;
  isStringsBased: boolean;
  projectDirectories: Map<string, number>;
  sourceHashes: Map<string, string> | undefined;
  // Shared per-path promise cache ensures concurrent tasks don't double-create directories
  directoryCreationPromises: Map<string, Promise<number>>;
  // Shared cache so files sharing the same customSegmentation reuse the uploaded srx storage id
  srxStorageIds: Map<string, Promise<number>>;
  uploadedSources: UploadedFile[];
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
    const isStringsBased = isStringsBasedProject(project);
    const patternFilePaths = this.collectPatternFilePaths(config, options, project);
    const containsExcludedLanguages = patternFilePaths.some(
      ({ fileOptions }) => (fileOptions.excluded_target_languages?.length ?? 0) > 0,
    );

    if (!hasManagerAccess(project) && (containsExcludedLanguages || options.deleteObsolete)) {
      reportNoManagerAccess(
        output,
        options.output,
        "You must have manager or developer role in the project to apply 'excluded-languages' or/and 'delete-obsolete' options",
      );
      return;
    }

    if (isStringsBased) {
      this.warnIgnoredOptions(options, containsExcludedLanguages, output);
    }

    this.validateExcludedTargetLanguages(patternFilePaths, project.targetLanguages);

    const branch = await this.resolveBranch(branchService, options, output);
    // A dry run doesn't create a missing branch; the real run would start it empty, so loading
    // with no branch id would plan against the root tree instead.
    const isBranchMissing = !branch && Boolean(options.branch) && options.branch !== 'none';

    if (isStringsBased && !branch && !isBranchMissing) {
      throw new CliError('A branch is required to upload sources for a strings-based project');
    }

    const skipProjectTree = isStringsBased || isBranchMissing;
    const projectFiles = skipProjectTree ? new ProjectFileIndex([]) : await fileService.loadIndex(branch);
    const projectDirectoryList = skipProjectTree ? [] : await directoryService.loadProjectDirectories(branch?.id);
    const run: UploadRun = {
      options,
      basePath: config.basePath,
      output,
      storageService,
      directoryService,
      fileService,
      stringService,
      branch,
      isStringsBased,
      projectDirectories: new Map(projectDirectoryList.map((directory) => [directory.path, directory.id])),
      sourceHashes: undefined,
      directoryCreationPromises: new Map(),
      srxStorageIds: new Map(),
      uploadedSources: [],
    };

    const deleteObsolete = Boolean(options.deleteObsolete) && !isStringsBased;
    const plan = new UploadSourcesPlanner().plan({
      config,
      groups: patternFilePaths,
      isStringsBased,
      autoUpdate: options.autoUpdate !== false,
      deleteObsolete,
      projectFiles,
      projectDirectories: projectDirectoryList,
      branchName: branch?.name,
    });

    if (deleteObsolete) {
      await this.deleteObsoleteEntries(run, plan);
    }

    // A machine --output emits the bare sorted in-project paths and wins over --tree; otherwise fall
    // through to the per-file "would be created/updated" messages. Paths are the resolved project
    // paths, not the local ones: a dry run has to show where the file lands in Crowdin, which `dest`
    // and a stripped common path (preserve_hierarchy: false) both move away from the repo layout.
    if (
      options.dryrun &&
      printDryRunPaths(
        toSortedRelativePaths(patternFilePaths.flatMap(({ files }) => files.map(({ projectPath }) => projectPath))),
        options,
        output,
      )
    ) {
      return;
    }

    if (options.cache && !options.dryrun) {
      run.sourceHashes = await loadSourceCache(config.basePath, output);
    }

    let hasErrors = false;

    for (const { patterns, fileOptions, files } of plan.groups) {
      if (files.length === 0) {
        // plain drops the message but still fails the run: a plain consumer is a script, and a
        // script that reads success from a broken pattern uploads nothing and says nothing.
        if (options.output !== 'plain') {
          output.error(
            `No sources found for '${patterns.source}' pattern. Check the source paths in your configuration file`,
          );
        }

        hasErrors = true;
        continue;
      }

      if (isStringsBased && patterns.context) {
        output.warning('Context can not be used for string-based projects');
      }

      const group: SourceGroup = {
        patterns,
        fileOptions,
        // Resolving creates missing labels, and a dry run never sends the ids anyway.
        labelIds:
          fileOptions.labels === undefined || options.dryrun
            ? undefined
            : await labelService.resolveLabelIds(fileOptions.labels),
        srxStorageIdPromise: this.uploadSrx(run, patterns),
      };
      const results = await runConcurrently(files.map((file) => () => this.runPlannedFile(run, group, file)));

      if (reportFailures(results, output)) {
        hasErrors = true;
      }
    }

    if (run.sourceHashes) {
      await saveSourceCache(config.basePath, run.sourceHashes, output);
    }

    this.printSummary(run);

    if (hasErrors) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
    }
  };

  private collectPatternFilePaths(
    config: Config,
    options: UploadSourcesOptions,
    project: ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings,
  ) {
    const serverLanguageMapping = hasManagerAccess(project) ? project.languageMapping : undefined;
    const sourceFileLoader = new SourceFileLoader(config);

    return config.files.map((patterns) => {
      const localFilePaths = sourceFileLoader.getFilePathsForPattern(patterns.source, patterns.ignore, {
        languages: project.targetLanguages,
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
  }

  // These options have no effect on strings-based projects (the strings upload request ignores them),
  // so warn instead of silently doing nothing.
  private warnIgnoredOptions(options: UploadSourcesOptions, containsExcludedLanguages: boolean, output: Output): void {
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

  // A dry run walks the same path as a real upload and reports the concrete would-create/update/delete
  // action per file, so it looks the branch up without creating it.
  private async resolveBranch(
    branchService: BranchService,
    options: UploadSourcesOptions,
    output: Output,
  ): Promise<SourceFilesModel.Branch | undefined> {
    if (options.dryrun) {
      return await branchService.getBranch(options.branch);
    }

    const { branch, created } = await branchService.getOrCreateBranch(options.branch);

    if (branch) {
      if (created) {
        output.success(`Branch '${branch.name}'`);
      } else {
        output.warning(`Branch '${branch.name}' already exists in the project`);
      }
    }

    return branch;
  }

  private uploadSrx(run: UploadRun, patterns: SourceGroup['patterns']): Promise<number> | undefined {
    const srxPath = patterns.custom_segmentation;

    // Strings-based import options ignore srxStorageId, so skip uploading the srx storage there.
    if (!srxPath || run.options.dryrun || run.isStringsBased) {
      return undefined;
    }

    const existing = run.srxStorageIds.get(srxPath);

    if (existing) {
      return existing;
    }

    const srxStorageId = run.storageService
      .addStorage(Bun.file(path.join(run.basePath, srxPath)))
      .then((storage) => storage.id);

    run.srxStorageIds.set(srxPath, srxStorageId);

    return srxStorageId;
  }

  private async runPlannedFile(run: UploadRun, group: SourceGroup, planned: PlannedFile): Promise<void> {
    const { projectPath, localFilePath } = planned.paths;

    if (planned.action === 'skip') {
      this.reportSkip(run, projectPath, planned.reason);
      return;
    }

    if (run.options.dryrun) {
      const verb = { create: 'created', update: 'updated', 'upload-strings': 'uploaded' }[planned.action];
      run.output.info(`File '${projectPath}' would be ${verb}`);
      return;
    }

    const upload: SourceUpload = {
      ...group,
      ...planned.paths,
      localFile: Bun.file(path.join(run.basePath, localFilePath)),
    };

    if (planned.action === 'upload-strings') {
      await this.uploadStrings(run, upload);
    } else if (planned.action === 'update') {
      await this.updateFile(run, upload, planned.projectFile, planned.rename);
    } else {
      await this.createFile(run, upload);
    }
  }

  private reportSkip(run: UploadRun, projectPath: string, reason: SkipReason): void {
    if (reason === 'already uploading') {
      run.output.warning(`Skipping file '${projectPath}' because it is already uploading/uploaded`);
    } else if (reason === 'empty') {
      run.output.warning(`File '${projectPath}' was skipped since it is empty`);
    } else {
      run.output.info(`File '${projectPath}' already exists and will not be updated`);
    }

    run.uploadedSources.push({ path: projectPath, action: 'skipped', reason });
  }

  private async uploadStrings(run: UploadRun, upload: SourceUpload): Promise<void> {
    const { localFile, localFilePath, patterns, labelIds } = upload;

    // Only a dry run may lack the branch, and it never executes; a real run requires one up front.
    const branchId = run.branch?.id as number;
    const checksum = run.sourceHashes ? await computeChecksum(localFile) : undefined;

    if (this.skipIfUpToDate(run, upload, checksum)) {
      return;
    }

    const storage = await run.storageService.addStorage(localFile);

    await run.stringService.uploadStrings(
      {
        branchId,
        storageId: storage.id,
        type: patterns.type as SourceStringsModel.UploadStringsType | undefined,
        labelIds,
        importOptions: buildStringsImportOptions(localFilePath, patterns),
      },
      localFilePath,
    );

    this.reportUploaded(run, upload, 'uploaded', checksum);
  }

  private async updateFile(
    run: UploadRun,
    upload: SourceUpload,
    projectFile: SourceFilesModel.File,
    rename: boolean,
  ): Promise<void> {
    const { output } = run;
    const { localFile, localFilePath, projectPath, patterns, fileOptions, labelIds } = upload;

    const checksum = run.sourceHashes ? await computeChecksum(localFile) : undefined;

    if (this.skipIfUpToDate(run, upload, checksum)) {
      return;
    }

    const srxStorageId = await upload.srxStorageIdPromise;
    const storage = await run.storageService.addStorage(localFile);
    // biome-ignore format: one argument per line
    const changedSettings = changedFileSettings(
      projectFile,
      {
        context: await this.readContext(run, upload),
        excludedTargetLanguages: fileOptions.excluded_target_languages,
      },
    );

    try {
      // biome-ignore format: one argument per line
      await run.fileService.updateProjectFile(
        projectFile.id,
        storage.id,
        localFilePath,
        {
          exportOptions: buildExportOptions(localFilePath, patterns, patterns.translation),
          importOptions: buildImportOptions(localFilePath, patterns, srxStorageId),
          updateOption: patterns.update_option as SourceFilesModel.UpdateOption | undefined,
          attachLabelIds: labelIds,
          // On a soft match the project file has a different name/extension; rename it to the source.
          name: rename ? path.parse(localFilePath).base : undefined,
          ...changedSettings,
        },
      );
    } catch (error) {
      if (error instanceof FileInUpdateError) {
        output.warning(`File '${projectPath}' is currently being updated`);
        run.uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'being updated' });
        return;
      }

      throw error;
    }

    this.reportUploaded(run, upload, 'updated', checksum);
  }

  private async createFile(run: UploadRun, upload: SourceUpload): Promise<void> {
    const { localFile, localFilePath, projectPath, patterns, fileOptions, labelIds } = upload;
    const pathDetails = path.parse(projectPath);
    const srxStorageId = await upload.srxStorageIdPromise;
    const storage = await run.storageService.addStorage(localFile);
    const directoryId = pathDetails.dir !== '' ? await this.addProjectDirectories(run, pathDetails.dir) : undefined;
    const context = await this.readContext(run, upload);

    try {
      await run.fileService.createProjectFile({
        storageId: storage.id,
        name: pathDetails.base,
        directoryId,
        branchId: run.branch?.id,
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

    this.reportUploaded(run, upload, 'created', run.sourceHashes ? await computeChecksum(localFile) : undefined);
  }

  private skipIfUpToDate(run: UploadRun, upload: SourceUpload, checksum: string | undefined): boolean {
    const { localFilePath, projectPath } = upload;

    if (checksum === undefined || run.sourceHashes?.get(localFilePath) !== checksum) {
      return false;
    }

    run.output.info(`File '${projectPath}' was skipped since it is up to date`);
    run.uploadedSources.push({ path: projectPath, action: 'skipped', reason: 'up to date' });

    return true;
  }

  private reportUploaded(
    run: UploadRun,
    upload: SourceUpload,
    action: UploadedFile['action'],
    checksum: string | undefined,
  ): void {
    if (checksum !== undefined) {
      run.sourceHashes?.set(upload.localFilePath, checksum);
    }

    run.output.success(`File '${upload.projectPath}'`);
    run.uploadedSources.push({ path: upload.projectPath, action });
  }

  private async readContext(run: UploadRun, upload: SourceUpload): Promise<string | undefined> {
    const { context } = upload.patterns;

    if (!context) {
      return undefined;
    }

    const contextPath = replaceFileDependentPlaceholders(context, upload.localFilePath);

    return await Bun.file(path.join(run.basePath, contextPath)).text();
  }

  // Text already streamed a line per file, so only the machine formats need the summary. Sorted
  // because the uploads run concurrently, and a machine contract should not depend on which
  // finished first. Emitted before the error throw so a partial run still reports what it managed.
  //
  // plain is line-oriented and cannot carry the action, so it lists only what changed.
  private printSummary({ options, output, uploadedSources }: UploadRun): void {
    if (isMachineFormat(options.output)) {
      const sorted = uploadedSources.sort((one, other) => one.path.localeCompare(other.path));

      output.list(
        isStructuredFormat(options.output) ? sorted : sorted.filter(({ action }) => action !== 'skipped'),
        uploadedFileView,
      );
    }
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

  private async deleteObsoleteEntries(run: UploadRun, plan: UploadSourcesPlan): Promise<void> {
    const { output, fileService, directoryService } = run;
    const dryRun = Boolean(run.options.dryrun);

    for (const projectFile of plan.obsoleteFiles) {
      const displayPath = stripLeadingSlashes(projectFile.path);

      if (dryRun) {
        output.info(`'${displayPath}' file would be deleted`);
      } else {
        await fileService.deleteProjectFile(projectFile.id, projectFile.path);
        output.success(`'${displayPath}' file was deleted`);
      }
    }

    for (const directory of plan.obsoleteDirectories) {
      const displayPath = `${stripLeadingSlashes(directory.path)}/`;

      if (dryRun) {
        output.info(`'${displayPath}' directory would be deleted`);
      } else {
        await directoryService.deleteProjectDirectory(directory.id, directory.path);
        output.success(`'${displayPath}' directory was deleted`);
      }
    }

    if (!dryRun) {
      if (plan.obsoleteFiles.length === 0) {
        output.success('No obsolete files were found');
      }

      if (plan.obsoleteDirectories.length === 0) {
        output.success('No obsolete directories found');
      }
    }
  }

  private async addProjectDirectories(run: UploadRun, projectDirectory: string) {
    const { branch, directoryCreationPromises, projectDirectories } = run;
    const directories = toPosixPath(projectDirectory).split('/');
    let directoryId: number | undefined;

    for (let index = 0; index < directories.length; index++) {
      const directoryName = directories[index] as string;
      const directoryPath = `${branch ? `/${branch.name}` : ''}/${directories.slice(0, index + 1).join('/')}`;

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
      const promise = run.directoryService
        .createProjectDirectory(directoryName, parentId, parentId ? undefined : branch?.id)
        .then((dir) => {
          projectDirectories.set(dir.path, dir.id);
          // Server paths carry the branch name; the listing shows project paths.
          run.output.success(`Directory '${stripLeadingSlashes(stripBranchPrefix(directoryPath, branch?.name))}'`);
          return dir.id;
        });

      directoryCreationPromises.set(directoryPath, promise);

      directoryId = await promise;
    }

    return directoryId;
  }
}
