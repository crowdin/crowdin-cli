import path from 'node:path';
import type { LanguagesModel, SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import type { GetApiClient } from '@/cli/services.ts';
import SourceFileLoader from '@/lib/config/sourceFileLoader.ts';
import TranslationPathResolver from '@/lib/config/translationPathResolver.ts';
import type { Config } from '@/lib/config.ts';
import CliError from '../../errors/CliError.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { StorageService } from '../../services/StorageService.ts';
import type { CommandDef } from '../../types.ts';
import type { Output } from '../../utils/output.ts';
import dryRun from '../common/options/dryRun.ts';
import tree from '../common/options/tree.ts';
import basePath from '../init/options/basePath.ts';
import baseUrl from '../init/options/baseUrl.ts';
import destination from '../init/options/destination.ts';
import noPreserveHierarchy from '../init/options/noPreserveHierarchy.ts';
import projectId from '../init/options/projectId.ts';
import source from '../init/options/source.ts';
import token from '../init/options/token.ts';
import translation from '../init/options/translation.ts';
import autoApproveImported from './options/autoApproveImported.ts';
import branch from './options/branch.ts';
import deleteObsolete from './options/deleteObsolete.ts';
import excludedLanguage from './options/excludedLanguage.ts';
import importEqSuggestions from './options/importEqSuggestions.ts';
import label from './options/label.ts';
import noAutoUpdate from './options/noAutoUpdate.ts';
import translateHidden from './options/translateHidden.ts';

type GetConfig = (command: Command) => Promise<Config>;
type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;
type GetStorageService = (command: Command) => Promise<StorageService>;

interface UploadSourcesOptions {
  branch?: string;
  label?: string[];
  deleteObsolete?: boolean;
  noAutoUpdate?: boolean;
  excludedLanguage?: string[];
  dryRun?: boolean;
}

interface UploadTranslationsOptions {
  branch?: string;
  language?: string;
  autoApproveImported?: boolean;
  importEqSuggestions?: boolean;
  translateHidden?: boolean;
  dryRun?: boolean;
}

interface SourceFileOptions {
  labels?: string[];
  excluded_target_languages?: string[];
}

interface ProjectFile {
  data: {
    id: number;
    path: string;
  };
}

interface ProjectDirectory {
  data: {
    id: number;
    path: string;
  };
}

export default class UploadCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getApiClient: GetApiClient,
  ) {
  }

  getDefinition(): CommandDef {
    const configOptionGroup = {
      group: 'Config options:',
      options: [token, baseUrl, basePath, projectId, source, translation, destination, noPreserveHierarchy],
    }

    const uploadSourcesOptions = [
      branch,
      label,
      excludedLanguage,
      deleteObsolete,
      noAutoUpdate,
      dryRun,
      tree,
      configOptionGroup,
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
          options: [branch, dryRun, autoApproveImported, importEqSuggestions, translateHidden, configOptionGroup],
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
    const apiClient = await this.getApiClient(command);

    const branch = await projectService.branch.getOrCreateBranch(options.branch);
    const branchId = branch?.id;
    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles(branchId);
    const projectFilePaths = new Map(projectFiles.data.map((file) => [file.data.path, file.data.id]));
    const projectDirectoryList = await projectService.directory.loadProjectDirectories(branchId);
    const projectDirectories = new Map(
      projectDirectoryList.map((directory) => [directory.data.path, directory.data.id]),
    );
    const sourceFileLoader = new SourceFileLoader(config);

    const patternFilePaths = config.files.map((patterns) => ({
      patterns,
      filePaths: sourceFileLoader.getFilePathsForPattern(patterns.source),
    }));

    const expectedProjectFilePaths = new Set(
      patternFilePaths.flatMap(({ filePaths }) => filePaths.map((filePath) => this.toProjectPath(filePath))),
    );

    if (options.deleteObsolete) {
      await this.deleteObsoleteProjectEntries(
        projectFiles.data,
        projectDirectoryList,
        expectedProjectFilePaths,
        projectService,
        output,
        Boolean(options.dryRun),
      );
    }

    for (const { patterns, filePaths } of patternFilePaths) {
      const fileOptions = this.resolveSourceFileOptions(patterns, options);
      const labelIds =
        fileOptions.labels !== undefined ? await projectService.label.resolveLabelIds(fileOptions.labels) : undefined;

      for (const localFilePath of filePaths) {
        if (projectFilePaths.has(`/${localFilePath}`)) {
          if (options.noAutoUpdate) {
            output.info(`File ${localFilePath} already exists and will not be updated`);
            continue;
          }

          if (options.dryRun) {
            output.info(`File ${localFilePath} would be updated`);
            continue;
          }

          const storage = await storageService.addStorage(Bun.file(path.join(config.basePath, localFilePath)));
          await projectService.file.updateProjectFile(
            projectFilePaths.get(`/${localFilePath}`) as number,
            storage.data.id,
            localFilePath,
            patterns.translation,
            labelIds,
            fileOptions.excluded_target_languages,
          );
          output.success(`File ${localFilePath} updated`);
          continue;
        }

        const pathDetails = path.parse(localFilePath);
        let directoryId: number | undefined;

        if (options.dryRun) {
          output.info(`File ${localFilePath} would be created`);
          continue;
        }

        const storage = await storageService.addStorage(Bun.file(path.join(config.basePath, localFilePath)));

        if (pathDetails.dir !== '') {
          directoryId = await this.addProjectDirectories(
            pathDetails,
            projectDirectories,
            projectService,
            output,
            branch,
          );
        }

        await apiClient.sourceFilesApi.createFile(project.data.id, {
          storageId: storage.data.id,
          name: pathDetails.base,
          directoryId,
          branchId,
          exportOptions: { exportPattern: patterns.translation },
          excludedTargetLanguages: fileOptions.excluded_target_languages,
          attachLabelIds: labelIds,
        });

        output.success(`File ${localFilePath} created`);
      }
    }
  };

  private async deleteObsoleteProjectEntries(
    projectFiles: ProjectFile[],
    projectDirectories: ProjectDirectory[],
    expectedProjectFilePaths: Set<string>,
    projectService: ProjectService,
    output: Output,
    dryRun: boolean,
  ) {
    const obsoleteFiles = projectFiles.filter(
      (projectFile) => !expectedProjectFilePaths.has(this.toProjectPath(projectFile.data.path)),
    );

    for (const projectFile of obsoleteFiles) {
      const projectFilePath = this.toProjectPath(projectFile.data.path);

      if (dryRun) {
        output.info(`File ${projectFilePath} would be deleted as obsolete`);
      } else {
        await projectService.file.deleteProjectFile(projectFile.data.id, projectFilePath);
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
        await projectService.directory.deleteProjectDirectory(directory.data.id, directoryPath);
        output.success(`Directory ${directoryPath} deleted as obsolete`);
      }
    }
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
    projectService: ProjectService,
    output: Output,
    branch?: SourceFilesModel.Branch,
  ) {
    const directories = pathDetails.dir.split(path.sep);
    let directoryId: number | undefined;

    for (let index = 0; index < directories.length; index++) {
      const directoryName = directories[index] as string;
      const directoryPath = `${branch ? `/${branch.name}` : ''}/${directories.slice(0, index + 1).join('/')}`;

      if (projectDirectories.has(directoryPath)) {
        directoryId = projectDirectories.get(directoryPath);
        continue;
      }

      const projectDirectory = await projectService.directory.createProjectDirectory(
        directoryName,
        directoryId,
        directoryId ? undefined : branch?.id,
      );

      directoryId = projectDirectory.data.id;
      projectDirectories.set(projectDirectory.data.path, projectDirectory.data.id);

      output.success(`Directory ${directoryName} created`);
    }

    return directoryId;
  }

  uploadTranslationsAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadTranslationsOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const translationPathResolver = new TranslationPathResolver(config);

    const branch = await projectService.branch.getOrCreateBranch(options.branch);
    const branchId = branch?.id;
    const project = await projectService.loadProject();
    const projectFiles = await projectService.loadProjectFiles(branchId);
    const targetLanguages = this.filterTargetLanguages(project.data.targetLanguages, options.language);

    for (const projectFile of projectFiles.data) {
      for (const targetLanguage of targetLanguages) {
        const projectFilePath = projectFile.data.path.startsWith('/')
          ? projectFile.data.path.slice(1)
          : projectFile.data.path;
        const filePath = translationPathResolver.resolve(Bun.file(projectFilePath), targetLanguage).slice(1);
        const localFilePath = path.join(config.basePath, filePath);

        if (!(await Bun.file(localFilePath).exists())) {
          output.warning(`File ${filePath} does not exist in the specified location`);
          continue;
        }

        if (options.dryRun) {
          output.info(`File ${filePath} would be queued for translations import`);
          continue;
        }

        const storage = await storageService.addStorage(Bun.file(localFilePath));

        await projectService.translation.importProjectTranslation(
          storage.data.id,
          projectFile.data.id,
          [targetLanguage.id],
          filePath,
          options.autoApproveImported,
          options.importEqSuggestions,
          options.translateHidden,
        );

        output.success(`File ${filePath} was queued for translations import`);
      }
    }
  };

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
