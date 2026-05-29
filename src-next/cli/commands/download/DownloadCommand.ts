import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ResponseObject, TranslationsModel } from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { fileTree } from '@/cli/utils/fileTree.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
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
import branch from '../upload/options/branch.ts';
import all from './options/all.ts';
import excludeLanguage from './options/excludeLanguage.ts';
import exportOnlyApproved from './options/exportOnlyApproved.ts';
import ignoreMatch from './options/ignoreMatch.ts';
import keepArchive from './options/keepArchive.ts';
import language from './options/language.ts';
import pseudo from './options/pseudo.ts';
import reviewed from './options/reviewed.ts';
import skipUntranslatedFiles from './options/skipUntranslatedFiles.ts';
import skipUntranslatedStrings from './options/skipUntranslatedStrings.ts';

interface TranslationsOptions extends GlobalOptions {
  branch?: string;
  language?: string[];
  excludeLanguage?: string[];
  pseudo?: boolean;
  skipUntranslatedStrings?: boolean;
  skipUntranslatedFiles?: boolean;
  exportOnlyApproved?: boolean;
  keepArchive?: boolean;
  all?: boolean;
  dryRun?: boolean;
  tree?: boolean;
  ignoreMatch?: boolean;
}

interface SourcesOptions extends GlobalOptions {
  branch?: string;
  reviewed?: boolean;
  dryRun?: boolean;
}

export default class DownloadCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
    private getTranslationService: GetTranslationService,
  ) {}

  getDefinition(): CommandDef {
    const configOptionGroup = {
      group: 'Config options:',
      options: [token, baseUrl, basePath, projectId, source, translation, destination, noPreserveHierarchy],
    };

    const translationsOptions = [
      branch,
      language,
      excludeLanguage,
      pseudo,
      skipUntranslatedStrings,
      skipUntranslatedFiles,
      exportOnlyApproved,
      keepArchive,
      all,
      dryRun,
      tree,
      ignoreMatch,
      configOptionGroup,
    ];

    return {
      name: 'download',
      alias: 'pull',
      description: 'Download the latest translations from Crowdin',
      options: translationsOptions,
      action: this.translationsAction,
      subcommands: [
        {
          name: 'sources',
          description: 'Download sources from Crowdin',
          options: [branch, reviewed, dryRun, configOptionGroup],
          action: this.sourcesAction,
        },
        {
          name: 'translations',
          description: 'Download the latest translations from Crowdin',
          options: translationsOptions,
          action: this.translationsAction,
        },
      ],
    };
  }

  sourcesAction = async (command: Command) => {
    const options = command.optsWithGlobals() as SourcesOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);

    await projectService.loadProject();
    const branchId = await this.resolveBranchId(options.branch, branchService);
    const projectFiles = await fileService.loadProjectFiles(branchId);

    if (options.dryRun) {
      for (const file of projectFiles.data) {
        output.log((file.data.path || '').replace(/^\//, ''));
      }

      return;
    }

    if (options.reviewed) {
      const build = await fileService.buildReviewedSources(branchId);
      const downloadUrl = await fileService.getReviewedSourcesDownloadUrl(build.data.id);
      const response = await fetch(downloadUrl);
      const archivePath = path.join(config.basePath, 'crowdin-reviewed-sources.zip');

      await Bun.write(archivePath, response);

      const zip = new AdmZip(archivePath);

      zip.extractAllTo(toPosixPath(config.basePath), true);

      try {
        await rm(archivePath, { force: true });
      } catch {
        output.warning(`Failed to remove archive ${archivePath}`);
      }

      output.success('Reviewed sources downloaded');

      return;
    }

    for (const projectFile of projectFiles.data) {
      const relativePath = (projectFile.data.path || '').replace(/^\//, '');
      try {
        const filePath = path.join(config.basePath, relativePath);
        const downloadUrl = await fileService.getSourceFileDownloadUrl(projectFile.data.id);
        const response = await fetch(downloadUrl);

        await mkdir(path.dirname(filePath), { recursive: true });
        await Bun.write(filePath, response);
        output.success(`File ${relativePath} downloaded`);
      } catch (error) {
        throw toCliError(error, `Failed to download ${relativePath}`);
      }
    }
  };

  translationsAction = async (command: Command) => {
    const options = command.optsWithGlobals() as TranslationsOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);
    const translationService = await this.getTranslationService(command);
    const project = await projectService.loadProject();

    if (
      options.language &&
      options.language.length > 0 &&
      options.excludeLanguage &&
      options.excludeLanguage.length > 0
    ) {
      throw new CliError(`Options '--language' and '--exclude-language' can't be used together`);
    }

    const targetLanguageIds = project.data.targetLanguages.map((l) => l.id);
    let resolvedLanguageIds: string[] | undefined;

    if (options.language && options.language.length > 0) {
      for (const langId of options.language) {
        if (!targetLanguageIds.includes(langId)) {
          throw new CliError(`Language ${langId} does not exist in project`);
        }
      }

      resolvedLanguageIds = options.language;
    } else if (options.excludeLanguage && options.excludeLanguage.length > 0) {
      for (const langId of options.excludeLanguage) {
        if (!targetLanguageIds.includes(langId)) {
          throw new CliError(`Language ${langId} does not exist in project`);
        }
      }

      resolvedLanguageIds = targetLanguageIds.filter((id) => !options.excludeLanguage?.includes(id));
    }

    const branchId = await this.resolveBranchId(options.branch, branchService);

    if (options.dryRun) {
      const projectFiles = await fileService.loadProjectFiles(branchId);
      const paths = projectFiles.data.map((file) => (file.data.path || '').replace(/^\//, ''));
      const lines = options.tree ? fileTree(paths) : paths;

      for (const line of lines) {
        output.log(line);
      }

      return;
    }

    if (options.pseudo) {
      output.info('Building pseudo translations');
    } else if (resolvedLanguageIds && resolvedLanguageIds.length > 0) {
      output.info(`Building translations for languages: ${resolvedLanguageIds.join(', ')}`);
    } else {
      output.info('Building translations');
    }

    const buildRequest: TranslationsModel.BuildRequest = {};

    if (branchId !== undefined) {
      buildRequest.branchId = branchId;
    }

    if (resolvedLanguageIds !== undefined && resolvedLanguageIds.length > 0) {
      buildRequest.targetLanguageIds = resolvedLanguageIds;
    }

    if (options.skipUntranslatedStrings) {
      buildRequest.skipUntranslatedStrings = true;
    }

    if (options.skipUntranslatedFiles) {
      buildRequest.skipUntranslatedFiles = true;
    }

    if (options.exportOnlyApproved) {
      buildRequest.exportApprovedOnly = true;
    }

    let build: ResponseObject<TranslationsModel.Build>;

    if (options.pseudo) {
      const pseudoRequest: TranslationsModel.PseudoBuildRequest = {
        pseudo: true,
        branchId,
      };

      build = await translationService.buildProjectTranslations(pseudoRequest);
    } else {
      build = await translationService.buildProjectTranslations(buildRequest);
    }

    output.info('Downloading translations');

    const downloadUrl = await translationService.getTranslationDownloadUrl(build.data.id);
    const response = await fetch(downloadUrl);

    output.info('Extracting archive');

    const tempDir = await mkdtemp(path.join(tmpdir(), 'crowdin-translations-'));

    try {
      const archivePath = path.join(tempDir, 'translations.zip');

      await Bun.write(archivePath, response);

      const basePath = `${path.join(config.basePath)}/`;
      const zip = new AdmZip(archivePath);

      zip.extractAllTo(basePath, true);

      if (options.keepArchive) {
        const savedArchivePath = path.join(config.basePath, 'crowdin-translations.zip');
        await Bun.write(savedArchivePath, Bun.file(archivePath));
        output.success(`Archive saved to ${savedArchivePath}`);
      }
    } finally {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        output.warning(`Failed to clean up temp directory ${tempDir}`);
      }
    }

    output.success('Done');
  };

  private async resolveBranchId(
    branchName: string | undefined,
    branchService: BranchService,
  ): Promise<number | undefined> {
    if (!branchName || branchName === 'none') {
      return undefined;
    }

    const branches = await branchService.listProjectBranches();
    const matchedBranch = branches.data.find((b) => b.data.name === branchName);

    if (!matchedBranch) {
      throw new CliError(`Branch ${branchName} not found`);
    }

    return matchedBranch.data.id;
  }
}
