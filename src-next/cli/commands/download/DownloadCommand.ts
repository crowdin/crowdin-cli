import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  type LanguagesModel,
  ProjectsGroupsModel,
  type ResponseObject,
  type TranslationsModel,
} from '@crowdin/crowdin-api-client';
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
import type { Output } from '@/cli/utils/output.ts';
import { matchesManagerSourceFile, matchesSourcePattern, replaceUnaryAsterisk } from '@/lib/config/projectFileMatch.ts';
import type { Config } from '@/lib/config.ts';
import { buildAllProjectTranslations, sortOmittedFiles } from '@/lib/download/projectTranslations.ts';
import { buildTranslationMapping } from '@/lib/download/translationMapping.ts';
import { originalPath } from '@/lib/export/patterns.ts';
import { prepareDest } from '@/lib/upload/fileOptions.ts';
import { toPosixPath } from '@/lib/utils/path.ts';
import { filesConfigGroup } from '../common/options/configGroups.ts';
import dryRun from '../common/options/dryRun.ts';
import tree from '../common/options/tree.ts';
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
  dryrun?: boolean;
  tree?: boolean;
  ignoreMatch?: boolean;
}

interface SourcesOptions extends GlobalOptions {
  branch?: string;
  reviewed?: boolean;
  dryrun?: boolean;
}

interface ExportCombo {
  skipUntranslatedStrings: boolean;
  skipUntranslatedFiles: boolean;
  exportApprovedOnly: boolean;
  exportStringsThatPassedWorkflow: boolean;
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
      filesConfigGroup,
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
          options: [branch, reviewed, dryRun, filesConfigGroup],
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

    // Java order (DownloadSourcesAction): reviewed/enterprise guard, then preserve_hierarchy warning,
    // then fetch the project and reject string-based ones.
    if (options.reviewed && !projectService.isEnterprise()) {
      output.warning('Operation is available only for Crowdin Enterprise');
      return;
    }

    if (!config.preserveHierarchy) {
      output.warning(
        "Because the 'preserve_hierarchy' parameter is set to 'false':\n" +
          '\t- CLI might download some unexpected files that match the pattern;\n' +
          '\t- Source file hierarchy may not be preserved and will be the same as in Crowdin.',
      );
    }

    const project = await projectService.loadProject();

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      throw new CliError('File management is not available for string-based projects');
    }

    const branchId = await this.resolveBranchId(options.branch, branchService);
    const projectFiles = await fileService.loadProjectFiles(branchId);
    const downloads = this.collectSourceDownloads(config, projectFiles.data, this.isManagerAccess(project), output);

    if (options.dryrun) {
      for (const download of downloads) {
        output.log(download.relativePath);
      }

      return;
    }

    if (options.reviewed) {
      const build = await fileService.buildReviewedSources(branchId);
      const downloadUrl = await fileService.getReviewedSourcesDownloadUrl(build.data.id);
      const response = await fetch(downloadUrl);
      const tempDir = await mkdtemp(path.join(tmpdir(), 'crowdin-reviewed-sources-'));

      try {
        const archivePath = path.join(tempDir, 'reviewed.zip');
        await Bun.write(archivePath, response);

        // The reviewed archive nests every file under a `<source_language_id>-REV` directory;
        // strip that prefix so keys line up with the project file paths (mirrors Java).
        const prefix = `${project.data.sourceLanguageId}-REV`;
        const reviewedFiles = new Map<string, Uint8Array>();
        const zip = new AdmZip(archivePath);

        for (const entry of zip.getEntries()) {
          if (entry.isDirectory) {
            continue;
          }

          const name = toPosixPath(entry.entryName).replace(/^\//, '');

          if (!name.startsWith(`${prefix}/`)) {
            continue;
          }

          reviewedFiles.set(name.slice(prefix.length), entry.getData());
        }

        for (const download of downloads) {
          const content = reviewedFiles.get(`/${download.relativePath}`);

          if (!content) {
            continue;
          }

          const filePath = path.join(config.basePath, download.destination);

          await mkdir(path.dirname(filePath), { recursive: true });
          await Bun.write(filePath, content);
          output.success(`File ${download.relativePath} downloaded`);
        }
      } finally {
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch {
          output.warning(`Failed to clean up temp directory ${tempDir}`);
        }
      }

      return;
    }

    for (const download of downloads) {
      try {
        const filePath = path.join(config.basePath, download.destination);
        const downloadUrl = await fileService.getSourceFileDownloadUrl(download.fileId);
        const response = await fetch(downloadUrl);

        await mkdir(path.dirname(filePath), { recursive: true });
        await Bun.write(filePath, response);
        output.success(`File ${download.relativePath} downloaded`);
      } catch (error) {
        throw toCliError(error, `Failed to download ${download.relativePath}`);
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

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      throw new CliError('File management is not available for string-based projects');
    }

    if (!this.isManagerAccess(project)) {
      output.warning('You must have manager or developer role in the project to perform this action');
      return;
    }

    if (
      options.language &&
      options.language.length > 0 &&
      options.excludeLanguage &&
      options.excludeLanguage.length > 0
    ) {
      throw new CliError(`Options '--language' and '--exclude-language' can't be used together`);
    }

    // Java validates/downloads against getProjectLanguages(true) = target languages + the in-context
    // pseudo language (when the project has one), not just the target languages.
    const inContextPseudoLanguage =
      'inContextPseudoLanguage' in project.data ? project.data.inContextPseudoLanguage : undefined;
    const projectLanguages = inContextPseudoLanguage
      ? [...project.data.targetLanguages, inContextPseudoLanguage]
      : project.data.targetLanguages;
    const projectLanguageIds = projectLanguages.map((l) => l.id);
    let resolvedLanguageIds: string[] | undefined;
    let resolvedLanguages: LanguagesModel.Language[] = projectLanguages;

    if (options.language && options.language.length > 0) {
      for (const langId of options.language) {
        if (!projectLanguageIds.includes(langId)) {
          throw new CliError(`Language ${langId} does not exist in project`);
        }
      }

      resolvedLanguageIds = options.language;
      resolvedLanguages = projectLanguages.filter((l) => options.language?.includes(l.id));
    } else {
      const exportLanguages = config.exportLanguages ?? [];

      for (const langId of exportLanguages) {
        if (!projectLanguageIds.includes(langId)) {
          throw new CliError(`Language ${langId} does not exist in project`);
        }
      }

      const excludeLanguages = options.excludeLanguage ?? [];

      for (const langId of excludeLanguages) {
        if (!projectLanguageIds.includes(langId)) {
          throw new CliError(`Language ${langId} does not exist in project`);
        }
      }

      // Base set = config export_languages if present, else all project languages; excludes subtract.
      const baseLanguages =
        exportLanguages.length > 0 ? projectLanguages.filter((l) => exportLanguages.includes(l.id)) : projectLanguages;
      const forLanguages = baseLanguages.filter((l) => !excludeLanguages.includes(l.id));

      // Java only pins targetLanguageIds on the build when export_languages or excludes narrow the set.
      if (exportLanguages.length > 0 || excludeLanguages.length > 0) {
        resolvedLanguageIds = forLanguages.map((l) => l.id);
      }

      resolvedLanguages = forLanguages;
    }

    const serverLanguageMapping = 'languageMapping' in project.data ? project.data.languageMapping : undefined;

    const branchId = await this.resolveBranchId(options.branch, branchService);

    if (options.dryrun) {
      // Java lists the resolved translation destination paths (per source x language), not the raw
      // server source paths (ListTranslationsAction -> DryrunTranslations). Reuse the same mapping
      // the real download uses; its values are exactly those local destination paths.
      // Java's ListTranslationsAction always loads the full server file map (independent of --all) so it
      // can drop target languages excluded server-side per file (DryrunTranslations.containsExcludedLanguage).
      const projectFiles = await fileService.loadProjectFiles(branchId);
      const serverSourcePaths = options.all
        ? projectFiles.data.map((file) => (file.data.path || '').replace(/^\//, ''))
        : undefined;
      const excludedTargetLanguagesByPath = this.buildExcludedTargetLanguagesByPath(projectFiles.data);

      const mapping = buildTranslationMapping(config, resolvedLanguages, serverLanguageMapping, {
        useServerSources: options.all,
        serverSourcePaths,
        excludedTargetLanguagesByPath,
      });
      const paths = [...new Set(mapping.byArchivePath.values())].sort();
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

    const isOrganization = projectService.isEnterprise();

    // Both skip flags together is invalid (Java params-level check, mirroring the per-file schema rule).
    if (options.skipUntranslatedStrings && options.skipUntranslatedFiles) {
      throw new CliError(
        'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
      );
    }

    const buildGroups = this.buildExportGroups(config, options, branchId, resolvedLanguageIds, isOrganization, output);
    const projectSkipUntranslatedFiles =
      'skipUntranslatedFiles' in project.data ? Boolean(project.data.skipUntranslatedFiles) : false;

    output.info('Downloading translations');

    let projectFiles: Awaited<ReturnType<typeof fileService.loadProjectFiles>> | undefined;
    let serverSourcePaths: string[] | undefined;

    if (options.all) {
      if (!config.preserveHierarchy) {
        output.warning(
          "Because the 'preserve_hierarchy' parameter is set to 'false' CLI might download some unexpected " +
            'files that match the pattern',
        );
      }

      projectFiles = await fileService.loadProjectFiles(branchId);
      serverSourcePaths = projectFiles.data.map((file) => (file.data.path || '').replace(/^\//, ''));
    }

    const tempDirs: string[] = [];
    // One omitted-entry list per build; reported as the cross-build intersection (Java totalOmittedFiles).
    const perBuildOmitted: string[][] = [];
    let anyFileDownloaded = false;
    let skipUntranslatedFilesUsed = projectSkipUntranslatedFiles;

    try {
      for (const [buildIndex, group] of buildGroups.entries()) {
        if (group.request.skipUntranslatedFiles) {
          skipUntranslatedFilesUsed = true;
        }

        let build: ResponseObject<TranslationsModel.Build>;

        try {
          build = group.pseudo
            ? await translationService.buildProjectTranslations(group.pseudo)
            : await translationService.buildProjectTranslations(group.request);
        } catch {
          // Mirrors Java's ProjectBuildFailedException handling: warn and abort gracefully.
          output.warning("Didn't manage to build translations");
          return;
        }

        const downloadUrl = await translationService.getTranslationDownloadUrl(build.data.id);
        const response = await fetch(downloadUrl);

        const tempDir = await mkdtemp(path.join(tmpdir(), 'crowdin-translations-'));
        tempDirs.push(tempDir);
        const archivePath = path.join(tempDir, 'translations.zip');

        await Bun.write(archivePath, response);

        // Pseudo builds always map all target languages (Java ignores export_languages/exclude here).
        const mappingLanguages = group.pseudo ? projectLanguages : resolvedLanguages;
        const mapping = buildTranslationMapping(config, mappingLanguages, serverLanguageMapping, {
          useServerSources: options.all,
          serverSourcePaths,
          files: group.files,
        });
        const zip = new AdmZip(archivePath);
        const omittedFiles: string[] = [];

        for (const entry of zip.getEntries()) {
          if (entry.isDirectory) {
            continue;
          }

          const archiveRelPath = toPosixPath(entry.entryName).replace(/^\//, '');
          const localPath = mapping.byArchivePath.get(archiveRelPath);

          // Entries with no config mapping are "omitted" and reported below.
          if (!localPath) {
            omittedFiles.push(archiveRelPath);
            continue;
          }

          const targetPath = path.join(config.basePath, localPath);

          await mkdir(path.dirname(targetPath), { recursive: true });
          await Bun.write(targetPath, entry.getData());
          anyFileDownloaded = true;
          output.success(`File ${localPath} extracted`);
        }

        perBuildOmitted.push(omittedFiles);

        if (options.keepArchive) {
          const name = buildGroups.length > 1 ? `crowdin-translations-${buildIndex}.zip` : 'crowdin-translations.zip';
          const savedArchivePath = path.join(config.basePath, name);
          await Bun.write(savedArchivePath, Bun.file(archivePath));
          output.success(`Archive saved to ${savedArchivePath}`);
        }
      }

      if (!options.ignoreMatch && perBuildOmitted.some((omitted) => omitted.length > 0)) {
        const files = projectFiles ?? (await fileService.loadProjectFiles(branchId));
        const allProjectTranslations = buildAllProjectTranslations(files.data, projectLanguages, serverLanguageMapping);

        this.reportOmittedFiles(perBuildOmitted, allProjectTranslations, output, options.verbose ?? false);
      }

      if (!anyFileDownloaded) {
        if (skipUntranslatedFilesUsed) {
          output.warning(
            "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, " +
              'please make sure you have fully translated files',
          );
        } else {
          throw new CliError("Couldn't find any file to download");
        }
      }
    } finally {
      for (const tempDir of tempDirs) {
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch {
          output.warning(`Failed to clean up temp directory ${tempDir}`);
        }
      }
    }

    output.success('Done');
  };

  /**
   * Builds the list of translation builds to issue. `pseudo` always produces a single all-files
   * build. Otherwise files are grouped by their effective export-option combo (mirroring Java's
   * `distinct()` over the four per-file flags) so each combo is built once and only its own file
   * groups are mapped from that archive. A CLI flag (when set) overrides the per-file config value
   * on every file, forcing `true` — picocli/commander boolean flags can only force true, never false.
   */
  private buildExportGroups(
    config: Config,
    options: TranslationsOptions,
    branchId: number | undefined,
    resolvedLanguageIds: string[] | undefined,
    isOrganization: boolean,
    output: Output,
  ): {
    files: Config['files'];
    request: TranslationsModel.BuildRequest;
    pseudo?: TranslationsModel.PseudoBuildRequest;
  }[] {
    if (options.pseudo) {
      const pseudo: TranslationsModel.PseudoBuildRequest = { pseudo: true, branchId };
      const pseudoLocalization = config.pseudoLocalization;

      if (pseudoLocalization) {
        if (pseudoLocalization.length_correction !== undefined) {
          pseudo.lengthTransformation = pseudoLocalization.length_correction;
        }

        if (pseudoLocalization.prefix !== undefined) {
          pseudo.prefix = pseudoLocalization.prefix;
        }

        if (pseudoLocalization.suffix !== undefined) {
          pseudo.suffix = pseudoLocalization.suffix;
        }

        if (pseudoLocalization.character_transformation !== undefined) {
          pseudo.charTransformation = pseudoLocalization.character_transformation;
        }
      }

      return [{ files: config.files, request: {}, pseudo }];
    }

    const effectiveCombo = (file: Config['files'][number]): ExportCombo => ({
      skipUntranslatedStrings: options.skipUntranslatedStrings ? true : (file.skip_untranslated_strings ?? false),
      skipUntranslatedFiles: options.skipUntranslatedFiles ? true : (file.skip_untranslated_files ?? false),
      exportApprovedOnly: options.exportOnlyApproved ? true : (file.export_only_approved ?? false),
      exportStringsThatPassedWorkflow: file.export_strings_that_passed_workflow ?? false,
    });

    // Group files by distinct combo, preserving first-seen order (mirrors Java distinct()).
    const groups = new Map<string, { combo: ExportCombo; files: Config['files'] }>();

    for (const file of config.files) {
      const combo = effectiveCombo(file);
      const key = JSON.stringify(combo);
      const existing = groups.get(key);

      if (existing) {
        existing.files.push(file);
      } else {
        groups.set(key, { combo, files: [file] });
      }
    }

    return [...groups.values()].map(({ combo, files }) => {
      const request: TranslationsModel.BuildRequest = {};

      if (branchId !== undefined) {
        request.branchId = branchId;
      }

      if (resolvedLanguageIds !== undefined && resolvedLanguageIds.length > 0) {
        request.targetLanguageIds = resolvedLanguageIds;
      }

      if (combo.skipUntranslatedStrings) {
        request.skipUntranslatedStrings = true;
      }

      if (combo.skipUntranslatedFiles) {
        request.skipUntranslatedFiles = true;
      }

      if (isOrganization) {
        if (combo.exportApprovedOnly) {
          request.exportWithMinApprovalsCount = 1;
        }

        if (combo.exportStringsThatPassedWorkflow) {
          request.exportStringsThatPassedWorkflow = true;
        }
      } else {
        if (combo.exportApprovedOnly) {
          request.exportApprovedOnly = true;
        }

        if (combo.exportStringsThatPassedWorkflow) {
          output.warning('Exporting strings that passed workflow is supported only for Crowdin Enterprise');
        }
      }

      return { files, request };
    });
  }

  /**
   * Reports omitted archive entries across all builds. With multiple builds (one per export-option
   * combo), Java reports only files omitted in EVERY build: per-source translation lists are
   * intersected and the without-source list is intersected (mirrors Java's totalOmittedFiles
   * retainAll). A source absent from any build's omitted set contributes an empty intersection.
   */
  private reportOmittedFiles(
    perBuildOmitted: string[][],
    allProjectTranslations: Map<string, string[]>,
    output: Output,
    verbose: boolean,
  ): void {
    const sorted = perBuildOmitted.map((omitted) => sortOmittedFiles(omitted, allProjectTranslations));
    const faqLink = 'Visit the https://crowdin.github.io/crowdin-cli/faq for more details';

    let totalWithSources: Map<string, string[]> | undefined;

    for (const { withSources } of sorted) {
      if (totalWithSources === undefined) {
        totalWithSources = new Map([...withSources].map(([source, translations]) => [source, [...translations]]));
        continue;
      }

      for (const [source, translations] of withSources) {
        const current = totalWithSources.get(source);

        if (current) {
          totalWithSources.set(
            source,
            current.filter((translation) => translations.includes(translation)),
          );
        }
      }

      for (const source of totalWithSources.keys()) {
        if (!withSources.has(source)) {
          totalWithSources.set(source, []);
        }
      }
    }

    const withSourcesEntries = [...(totalWithSources ?? new Map<string, string[]>())].filter(
      ([, translations]) => translations.length > 0,
    );

    if (withSourcesEntries.length > 0) {
      output.warning(
        "Downloaded translations don't match the current project configuration. The translations for the " +
          'following sources will be omitted (use --verbose to get the list of the omitted translations):',
      );

      for (const [source, translations] of withSourcesEntries) {
        output.log(`\t- ${source} (${translations.length})`);

        if (verbose) {
          for (const translation of translations) {
            output.log(`\t\t- ${translation}`);
          }
        }
      }

      output.log(faqLink);
    }

    let totalWithoutSources = [...(sorted[0]?.withoutSources ?? [])];

    for (const { withoutSources } of sorted) {
      totalWithoutSources = totalWithoutSources.filter((file) => withoutSources.includes(file));
    }

    if (totalWithoutSources.length > 0) {
      output.warning('Due to missing respective sources, the following translations will be omitted:');

      for (const file of totalWithoutSources) {
        output.log(`\t- ${file}`);
      }

      output.log(faqLink);
    }
  }

  private isManagerAccess(
    project: ResponseObject<ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings>,
  ): boolean {
    return 'languageMapping' in project.data;
  }

  /**
   * Resolves which project source files should be downloaded for `download sources`, scoping each
   * config group to files matching its `dest ?? source` pattern (mirroring Java's
   * DownloadSourcesAction filtering). With manager access the file's export pattern must also be
   * compatible with the group `translation`. Files matching the group `ignore` patterns are dropped
   * (mirrors SourcesUtils.filterProjectFiles' ignore predicate). Each matched file's destination
   * applies `dest`.
   */
  private collectSourceDownloads(
    config: Config,
    projectFiles: { data: { id: number; path?: string; exportOptions?: unknown } }[],
    managerAccess: boolean,
    output: Output,
  ): { fileId: number; relativePath: string; destination: string }[] {
    const downloads: { fileId: number; relativePath: string; destination: string }[] = [];

    for (const patterns of config.files) {
      const searchPattern = patterns.dest ?? patterns.source;
      const ignore = patterns.ignore ?? [];

      const matched = projectFiles.filter((file) => {
        const relativePath = (file.data.path || '').replace(/^\//, '');

        if (!matchesSourcePattern(relativePath, searchPattern, config.preserveHierarchy)) {
          return false;
        }

        if (ignore.some((pattern) => matchesSourcePattern(relativePath, pattern, config.preserveHierarchy))) {
          return false;
        }

        if (managerAccess) {
          const exportPattern = (file.data.exportOptions as { exportPattern?: string } | undefined)?.exportPattern;
          if (
            !matchesManagerSourceFile(patterns, relativePath, exportPattern, searchPattern, config.preserveHierarchy)
          ) {
            return false;
          }
        }

        return true;
      });

      if (matched.length === 0) {
        output.warning(
          `No sources found for '${searchPattern}' pattern. Check the source paths in your configuration file`,
        );
        continue;
      }

      const sorted = [...matched].sort((a, b) => (a.data.path || '').localeCompare(b.data.path || ''));

      for (const file of sorted) {
        const relativePath = (file.data.path || '').replace(/^\//, '');
        const destination = this.resolveSourceDestination(patterns, relativePath);

        downloads.push({ fileId: file.data.id, relativePath, destination });
      }
    }

    return downloads;
  }

  /**
   * Computes a source file's local destination, mirroring Java DownloadSourcesAction. With no `dest`
   * the file keeps its project path. With `dest`: when `dest` has neither `**` nor `%original_path%`
   * and `source` has `**`, the `dest` pattern is applied directly; otherwise the destination is
   * derived from the `source` pattern via `replaceUnaryAsterisk` (substituting the real file
   * segments) — both then resolve file-dependent placeholders.
   */
  private resolveSourceDestination(patterns: Config['files'][number], relativePath: string): string {
    if (!patterns.dest) {
      return relativePath;
    }

    if (!patterns.dest.includes('**') && !patterns.dest.includes(originalPath) && patterns.source.includes('**')) {
      return prepareDest(patterns.dest, relativePath);
    }

    return prepareDest(replaceUnaryAsterisk(patterns.source, relativePath), relativePath);
  }

  // Maps each server source path (basePath-relative posix, no leading slash) to its excluded target
  // languages, so the dry-run listing can skip those languages per file (Java parity).
  private buildExcludedTargetLanguagesByPath(
    projectFiles: { data: { path?: string; excludedTargetLanguages?: string[] } }[],
  ): Map<string, string[]> {
    const byPath = new Map<string, string[]>();

    for (const file of projectFiles) {
      const excluded = file.data.excludedTargetLanguages;
      if (!excluded || excluded.length === 0) {
        continue;
      }

      byPath.set(toPosixPath(file.data.path || '').replace(/^\//, ''), excluded);
    }

    return byPath;
  }

  private async resolveBranchId(
    branchName: string | undefined,
    branchService: BranchService,
  ): Promise<number | undefined> {
    if (!branchName || branchName === 'none') {
      return undefined;
    }

    const branches = await branchService.list();
    const matchedBranch = branches.find((branch) => branch.name === branchName);

    if (!matchedBranch) {
      throw new CliError(`Branch ${branchName} not found`);
    }

    return matchedBranch.id;
  }
}
