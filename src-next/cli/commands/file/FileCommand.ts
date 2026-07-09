import { existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ResponseObject, SourceFilesModel, UploadStorageModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { branch as branchOption, projectConfigGroup, tree as treeOption } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import FileExistsError from '@/cli/errors/FileExistsError.ts';
import FileInUpdateError from '@/cli/errors/FileInUpdateError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import WrongLanguageError from '@/cli/errors/WrongLanguageError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
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
import { printFileTree } from '@/cli/utils/fileTree.ts';
import { resolveLanguagePlaceholders } from '@/lib/export/languagePlaceholders.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { pollUntilFinished } from '@/lib/upload/pollUpload.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
import { download, upload } from './options.ts';

interface UploadFileCommandOptions extends GlobalOptions {
  dest?: string;
  type?: string;
  parserVersion?: string;
  label?: string[];
  branch?: string;
  tree?: boolean;
  context?: string;
  excludedLanguage?: string[];
  noAutoUpdate?: boolean;
  language?: string;
  xliff?: boolean;
  cleanupMode?: boolean;
  updateStrings?: boolean;
}

export default class FileCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getStorageService: GetStorageService,
    private getDirectoryService: GetDirectoryService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
    private getBranchService: GetBranchService,
    private getTranslationService: GetTranslationService,
    private getStringService: GetStringService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'file',
      description: 'Manage source files and translations in a Crowdin project',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of source files in the current project',
          options: [branchOption, treeOption, projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'upload',
          description: 'Upload a file to a Crowdin project',
          arguments: [
            {
              name: 'file',
              description: 'Path to file to upload',
            },
          ],
          options: [
            branchOption,
            upload.language,
            upload.xliff,
            upload.noAutoUpdate,
            upload.label,
            upload.dest,
            upload.context,
            upload.type,
            upload.parserVersion,
            upload.excludedLanguage,
            upload.cleanupMode,
            upload.updateStrings,
            projectConfigGroup,
          ],
          action: this.uploadAction,
        },
        {
          name: 'download',
          description: 'Download a file to a specified location',
          arguments: [
            {
              name: 'file',
              description: 'Crowdin file path for download',
            },
          ],
          options: [download.dest, download.language, branchOption, projectConfigGroup],
          action: this.downloadAction,
        },
        {
          name: 'delete',
          description: 'Delete a file in a Crowdin project',
          arguments: [
            {
              name: 'file',
              description: 'Path to the file in the Crowdin project',
            },
          ],
          options: [branchOption, projectConfigGroup],
          action: this.deleteAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command?.help();
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);
    await projectService.loadProject();
    const branchId = await branchService.resolveBranchId(options.branch);
    const projectFiles = await fileService.loadProjectFiles(branchId);
    // Java strips leading slashes from displayed paths (FileListAction).
    const files = projectFiles.data.map((file) => ({ id: file.data.id, path: file.data.path.replace(/^\/+/, '') }));

    if (options.tree) {
      printFileTree(
        files.map((file) => file.path),
        output,
      );
      return;
    }

    output.table(files);
  };

  uploadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [filePath] = command.args;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const storageService = await this.getStorageService(command);
    const directoryService = await this.getDirectoryService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const branchService = await this.getBranchService(command);
    const fileType = options.type as SourceFilesModel.FileType | undefined;
    const parserVersion = options.parserVersion ? parseInt(options.parserVersion, 10) : undefined;

    if (!filePath) {
      throw new CliError('File path is required');
    }

    if (!existsSync(filePath)) {
      throw new CliError(`File '${filePath}' not found in the Crowdin project`);
    }

    if (statSync(filePath).isDirectory()) {
      throw new CliError('The specified file is a directory');
    }

    const localFile = Bun.file(filePath);
    const destPath = toPosixPath(options.dest || filePath);

    if (!destPath) {
      throw new CliError('Destination path is required');
    }

    if (parserVersion !== undefined && fileType === undefined) {
      throw new CliError("'--type' is required for '--parser-version' option");
    }

    if (options.xliff && !options.language) {
      throw new CliError("'--language' parameter is required for offline translation file");
    }

    if (options.xliff && options.dest) {
      throw new CliError("'--dest' parameter can not be used for offline translation file");
    }

    const project = await projectService.loadProject();

    if (options.language) {
      await this.uploadTranslation(command, options, filePath, localFile, destPath, project);
      return;
    }

    const isStringsBased = project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED;

    if (isStringsBased && options.context) {
      throw new CliError("'--context' parameter is only available for file-based projects");
    }

    const branch = await branchService.getOrCreateBranch(options.branch);
    const branchId = branch?.id;
    const labelIds = options.label?.length ? await labelService.resolveLabelIds(options.label) : undefined;

    if (isStringsBased) {
      await this.uploadStringsBased(command, filePath, localFile, destPath, branchId, options, labelIds);
      return;
    }

    const wantedPath = destPath.startsWith('/') ? destPath : `/${destPath}`;
    const projectFiles = await fileService.loadProjectFiles(branchId);
    const projectFilePaths = new Map(projectFiles.data.map((file) => [file.data.path, file.data.id]));
    const existingFile = fileLookup(wantedPath, projectFilePaths);
    const excludedTargetLanguages = options.excludedLanguage?.length ? options.excludedLanguage : undefined;
    const pathDetails = path.parse(destPath);

    if (existingFile) {
      if (options.noAutoUpdate) {
        output.info(`Project already contains the file '${destPath}'`);
        return;
      }

      const storage = await this.uploadToStorage(storageService, localFile, filePath);

      try {
        await fileService.updateProjectFile(
          existingFile.id,
          storage.data.id,
          filePath,
          undefined,
          undefined,
          undefined,
          labelIds,
          excludedTargetLanguages,
          // On a soft match the project file has a different name/extension; rename it to the source.
          existingFile.exact ? undefined : pathDetails.base,
        );
      } catch (error) {
        if (error instanceof FileInUpdateError) {
          output.warning(`File '${destPath}' is currently being updated`);
          return;
        }

        throw error;
      }

      output.success(`File '${destPath}'`);
      return;
    }

    const directoryId = await this.createDirectories(pathDetails.dir, directoryService, output, branchId);
    const storage = await this.uploadToStorage(storageService, localFile, filePath);

    try {
      const created = await fileService.createProjectFile({
        storageId: storage.data.id,
        name: pathDetails.base,
        directoryId,
        branchId,
        type: fileType,
        parserVersion,
        context: options.context,
        excludedTargetLanguages,
        attachLabelIds: labelIds,
      });

      // Java message.file.list: "#<id> <path>".
      output.success(`#${created.data.id} ${destPath}`);
    } catch (error) {
      if (error instanceof FileExistsError) {
        throw new CliError(`Project already contains the file '${destPath}'`);
      }

      throw error;
    }
  };

  // Upload path when `--language` is set: import translations for the file (Java FileUploadTranslationAction).
  private uploadTranslation = async (
    command: Command,
    options: UploadFileCommandOptions,
    filePath: string,
    localFile: ReturnType<typeof Bun.file>,
    destPath: string,
    project: ResponseObject<ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings>,
  ): Promise<void> => {
    const output = this.getOutput(command);
    const storageService = await this.getStorageService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);
    const translationService = await this.getTranslationService(command);
    const languageId = options.language as string;

    // Manager/developer role is exposed as `languageMapping` only on the settings-bearing response.
    if (!hasManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    if (!project.data.targetLanguages?.some((language) => language.id === languageId)) {
      throw new CliError(`Language '${languageId}' doesn't exist in the project. Try specifying another language code`);
    }

    const isStringsBased = project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED;
    const storage = await this.uploadToStorage(storageService, localFile, filePath);

    try {
      if (options.xliff) {
        await translationService.importXliffTranslation(storage.data.id, [languageId], filePath);
      } else if (!isStringsBased) {
        const branchId = await branchService.resolveBranchId(options.branch);
        const wantedPath = destPath.startsWith('/') ? destPath : `/${destPath}`;
        const projectFiles = await fileService.loadProjectFiles(branchId);
        const sourceFile = projectFiles.data.find((file) => file.data.path === wantedPath);

        if (!sourceFile) {
          throw new CliError(`File '${wantedPath}' not found in the Crowdin project`);
        }

        await translationService.importProjectTranslation(storage.data.id, sourceFile.data.id, [languageId], filePath);
      } else {
        const branchId = await branchService.resolveBranchId(options.branch);

        if (branchId === undefined) {
          throw new CliError('Branch is required for string-based projects');
        }

        await translationService.importProjectTranslationStringsBased(
          storage.data.id,
          branchId,
          [languageId],
          filePath,
        );
      }
    } catch (error) {
      if (error instanceof WrongLanguageError) {
        output.warning(
          `Translation file '${filePath}' hasn't been uploaded since the target language '${languageId}' ` +
            'is not enabled for the source file in your Crowdin project',
        );
        return;
      }

      throw error;
    }

    output.success(`File '${filePath}'`);
  };

  // Source upload for strings-based projects: branch is mandatory; upload + poll to completion
  // (Java FileUploadAction strings-based path).
  private uploadStringsBased = async (
    command: Command,
    filePath: string,
    localFile: ReturnType<typeof Bun.file>,
    destPath: string,
    branchId: number | undefined,
    options: UploadFileCommandOptions,
    labelIds: number[] | undefined,
  ): Promise<void> => {
    if (branchId === undefined) {
      throw new CliError('Branch is required for string-based projects');
    }

    const output = this.getOutput(command);
    const storageService = await this.getStorageService(command);
    const stringService = await this.getStringService(command);
    const storage = await this.uploadToStorage(storageService, localFile, filePath);
    const uploadResponse = await stringService.uploadStrings({
      branchId,
      storageId: storage.data.id,
      labelIds,
      cleanupMode: options.cleanupMode,
      updateStrings: options.updateStrings,
    });

    await pollUntilFinished(
      uploadResponse,
      (uploadId) => stringService.getUploadStringsStatus(uploadId),
      `Failed to upload strings for file ${filePath}`,
    );

    output.success(`File '${destPath}'`);
  };

  private uploadToStorage = async (
    storageService: Awaited<ReturnType<GetStorageService>>,
    localFile: ReturnType<typeof Bun.file>,
    filePath: string,
  ): Promise<ResponseObject<UploadStorageModel.Storage>> => {
    try {
      return await storageService.addStorage(localFile);
    } catch (error) {
      throw toCliError(error, `Failed to upload ${filePath}`);
    }
  };

  // Create the destination directory chain, reusing directories that already exist; only the root
  // segment carries the branchId (nested segments inherit it via their parent).
  private createDirectories = async (
    dir: string,
    directoryService: Awaited<ReturnType<GetDirectoryService>>,
    output: Awaited<ReturnType<GetOutput>>,
    branchId: number | undefined,
  ): Promise<number | undefined> => {
    if (!dir) {
      return undefined;
    }

    const existing = new Map(
      (await directoryService.loadProjectDirectories(branchId)).map((entry) => [
        toPosixPath(entry.data.path),
        entry.data.id,
      ]),
    );

    let parentId: number | undefined;
    let cumulative = '';

    for (const segment of toPosixPath(dir).split('/').filter(Boolean)) {
      cumulative = `${cumulative}/${segment}`;
      const existingId = existing.get(cumulative);

      if (existingId !== undefined) {
        parentId = existingId;
        continue;
      }

      try {
        const created = await directoryService.createProjectDirectory(
          segment,
          parentId,
          parentId ? undefined : branchId,
        );
        parentId = created.data.id;
        // Java message.directory: "Directory '<path>'" (cumulative path, no leading slash).
        output.success(`Directory '${cumulative.replace(/^\/+/, '')}'`);
      } catch (error) {
        throw toCliError(error, `Failed to create directory ${segment}`);
      }
    }

    return parentId;
  };

  downloadAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [rawFilePath] = command.args;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);

    if (!rawFilePath) {
      throw new CliError('File path is required');
    }

    const filePath = toPosixPath(rawFilePath);
    const wantedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const project = await projectService.loadProject();

    if (options.language) {
      await this.downloadTranslation(command, options, wantedPath, config, project);
      return;
    }

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      output.warning('File management is not available for string-based projects');
      return;
    }

    if (!hasManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    const branchId = await branchService.resolveBranchId(options.branch);
    const projectFiles = await fileService.loadProjectFiles(branchId);

    for (const projectFile of projectFiles.data) {
      if (projectFile.data.path === wantedPath) {
        // Java: with --dest write to `<dest>/<name>`; without it, to the source path itself.
        const fullFilePath = options.dest
          ? path.join(config.basePath, options.dest, path.basename(filePath))
          : path.join(config.basePath, filePath);

        try {
          const downloadUrl = await fileService.getSourceFileDownloadUrl(projectFile.data.id);
          await mkdir(path.dirname(fullFilePath), { recursive: true });
          await Bun.write(fullFilePath, await fetch(downloadUrl));
        } catch (error) {
          throw toCliError(error, `Failed to download ${filePath}`);
        }

        output.success(`File '${filePath}'`);
        return;
      }
    }

    throw new CliError(`File '${filePath}' not found in the Crowdin project`);
  };

  // Download path when `--language` is set: build and save file translations (Java FileDownloadTranslationAction).
  private downloadTranslation = async (
    command: Command,
    options: UploadFileCommandOptions,
    wantedPath: string,
    config: Awaited<ReturnType<GetConfig>>,
    project: ResponseObject<ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings>,
  ): Promise<void> => {
    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const translationService = await this.getTranslationService(command);

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      output.warning('File management is not available for string-based projects');
      return;
    }

    if (!hasManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    const languages =
      options.language === 'all'
        ? project.data.targetLanguages
        : project.data.targetLanguages.filter((language) => language.id === options.language);

    if (languages.length === 0) {
      throw new CliError(
        `Language '${options.language}' doesn't exist in the project. Try specifying another language code`,
      );
    }

    const branchId = await branchService.resolveBranchId(options.branch);
    const projectFiles = await fileService.loadProjectFiles(branchId);
    const sourceFile = projectFiles.data.find((file) => file.data.path === wantedPath);

    if (!sourceFile) {
      throw new CliError(`File '${wantedPath}' not found in the Crowdin project`);
    }

    for (const language of languages) {
      const destPath = options.dest
        ? resolveLanguagePlaceholders(`${options.dest}/${sourceFile.data.name}`, language)
        : `${language.id}${wantedPath}`;
      const fullFilePath = path.join(config.basePath, destPath);

      try {
        const url = await translationService.buildProjectFileTranslation(sourceFile.data.id, language.id);
        await mkdir(path.dirname(fullFilePath), { recursive: true });
        await Bun.write(fullFilePath, await fetch(url));
      } catch (error) {
        throw toCliError(error, `Failed to download ${destPath}`);
      }

      output.success(`File '${destPath}'`);
    }
  };

  deleteAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UploadFileCommandOptions;
    const [rawFilePath] = command.args;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);

    if (!rawFilePath) {
      throw new CliError('File path is required');
    }

    const filePath = toPosixPath(rawFilePath);
    const wantedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const project = await projectService.loadProject();

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      output.warning('File management is not available for string-based projects');
      return;
    }

    const branchId = await branchService.resolveBranchId(options.branch);
    const projectFiles = await fileService.loadProjectFiles(branchId);

    for (const file of projectFiles.data) {
      if (file.data.path === wantedPath) {
        try {
          await fileService.deleteProjectFile(file.data.id, file.data.path);
        } catch (error) {
          throw toCliError(error, `Failed to delete ${filePath}`);
        }

        output.success(`File '${filePath}' deleted`);
        return;
      }
    }

    throw new CliError(`File '${filePath}' not found in the Crowdin project`);
  };
}
