import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ProjectsGroupsModel, type TranslationsModel } from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from '@/cli/commands/common/failures.ts';
import { reportNoManagerAccess } from '@/cli/commands/common/managerAccess.ts';
import { pathView } from '@/cli/commands/common/views.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { downloadToFile } from '@/cli/utils/downloadToFile.ts';
import { isMachineFormat, isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import { matchesManagerSourceFile, matchesSourcePattern, replaceUnaryAsterisk } from '@/lib/config/projectFileMatch.ts';
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { resolveDownloadLanguages } from '@/lib/download/languages.ts';
import { buildAllProjectTranslations, sortOmittedFiles } from '@/lib/download/projectTranslations.ts';
import { buildTranslationMapping } from '@/lib/download/translationMapping.ts';
import { originalPath } from '@/lib/export/patterns.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { prepareDest } from '@/lib/upload/fileOptions.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import { stripBranchPrefix, stripLeadingSlashes, toPosixPath, toSortedRelativePaths } from '@/lib/utils/path.ts';
import { branch, dryRun, filesConfigGroup, tree } from '../common/options.ts';
import {
  all,
  excludeLanguage,
  exportOnlyApproved,
  ignoreMatch,
  keepArchive,
  language,
  pseudo,
  reviewed,
  skipUntranslatedFiles,
  skipUntranslatedStrings,
} from './options.ts';
import { type DownloadedFile, downloadedFileView } from './views.ts';

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
  skipUntranslatedStrings?: boolean;
  skipUntranslatedFiles?: boolean;
  exportApprovedOnly?: boolean;
  exportStringsThatPassedWorkflow?: boolean;
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
      description: 'Download the latest translations from Crowdin to the specified place',
      options: translationsOptions,
      action: this.translationsAction,
      subcommands: [
        {
          name: 'sources',
          description: 'Download sources from Crowdin to the specified place',
          options: [branch, reviewed, dryRun, filesConfigGroup],
          action: this.sourcesAction,
        },
        {
          name: 'translations',
          description: 'Download the latest translations from Crowdin to the specified place',
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

    assertFilesConfigured(config);

    if (options.reviewed && !projectService.isEnterprise()) {
      output.warning('Operation is available only for Crowdin Enterprise');
      // An early exit still owes the machine formats a document; an absent stdout would read as an
      // empty result either way.
      output.list([], downloadedFileView);
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

    const branch = await branchService.resolveBranch(options.branch);
    const projectFiles = await fileService.loadProjectFiles(branch?.id);
    const downloads = this.collectSourceDownloads(
      config,
      this.stripBranchFromPaths(projectFiles.data, branch?.name),
      hasManagerAccess(project),
      output,
    );

    if (options.dryrun) {
      const paths = toSortedRelativePaths(downloads.map((download) => download.relativePath));

      if (!printDryRunPaths(paths, options, output)) {
        output.list(paths, pathView);
      }

      return;
    }

    const downloadedFiles: DownloadedFile[] = [];

    if (options.reviewed) {
      const build = await fileService.buildReviewedSources(branch?.id);
      const downloadUrl = await fileService.getReviewedSourcesDownloadUrl(build.data.id);
      const tempDir = await mkdtemp(path.join(tmpdir(), 'crowdin-reviewed-sources-'));

      try {
        const archivePath = path.join(tempDir, 'reviewed.zip');
        await downloadToFile(downloadUrl, archivePath);

        // The reviewed archive nests every file under a `<source_language_id>-REV` directory;
        // strip that prefix so keys line up with the project file paths.
        const prefix = `${project.data.sourceLanguageId}-REV`;
        const reviewedFiles = new Map<string, Uint8Array>();
        const zip = new AdmZip(archivePath);

        for (const entry of zip.getEntries()) {
          if (entry.isDirectory) {
            continue;
          }

          const name = stripLeadingSlashes(toPosixPath(entry.entryName));

          if (!name.startsWith(`${prefix}/`)) {
            continue;
          }

          reviewedFiles.set(stripBranchPrefix(name.slice(prefix.length), branch?.name), entry.getData());
        }

        for (const download of downloads) {
          const content = reviewedFiles.get(`/${download.relativePath}`);

          if (!content) {
            downloadedFiles.push({
              path: download.relativePath,
              action: 'skipped',
              reason: 'not in the reviewed archive',
            });
            continue;
          }

          const filePath = path.join(config.basePath, download.destination);

          await mkdir(path.dirname(filePath), { recursive: true });
          await Bun.write(filePath, content);
          output.success(`File '${download.relativePath}'`);
          downloadedFiles.push({ path: download.relativePath, action: 'downloaded' });
        }
      } finally {
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch {
          output.warning(`Failed to clean up temp directory '${tempDir}'`);
        }
      }

      // Text already streamed a line per file, so only the machine formats need the summary.
      // plain is line-oriented and cannot carry the action, so it lists only what was written.
      if (isMachineFormat(options.output)) {
        const sorted = downloadedFiles.sort((one, other) => one.path.localeCompare(other.path));

        output.list(
          isStructuredFormat(options.output) ? sorted : sorted.filter(({ action }) => action !== 'skipped'),
          downloadedFileView,
        );
      }

      return;
    }

    const results = await runConcurrently(
      downloads.map((download) => async () => {
        try {
          const filePath = path.join(config.basePath, download.destination);
          const downloadUrl = await fileService.getSourceFileDownloadUrl(download.fileId);

          await downloadToFile(downloadUrl, filePath);
          output.success(`File '${download.relativePath}'`);
          downloadedFiles.push({ path: download.relativePath, action: 'downloaded' });
        } catch (error) {
          throw toCliError(error, `Failed to download '${download.relativePath}'`);
        }
      }),
    );
    const failed = reportFailures(results, output);

    if (isMachineFormat(options.output)) {
      output.list(
        downloadedFiles.sort((one, other) => one.path.localeCompare(other.path)),
        downloadedFileView,
      );
    }

    if (failed) {
      throw new CliError(EXECUTION_FINISHED_WITH_ERRORS);
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

    assertFilesConfigured(config);

    const project = await projectService.loadProject();

    if (project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED) {
      throw new CliError('File management is not available for string-based projects');
    }

    if (!hasManagerAccess(project)) {
      reportNoManagerAccess(output, options.output);
      return;
    }

    const inContextPseudoLanguage =
      'inContextPseudoLanguage' in project.data ? project.data.inContextPseudoLanguage : undefined;
    const projectLanguages = inContextPseudoLanguage
      ? [...project.data.targetLanguages, inContextPseudoLanguage]
      : project.data.targetLanguages;
    const { languages: resolvedLanguages, languageIds: resolvedLanguageIds } = resolveDownloadLanguages(
      projectLanguages,
      options,
      config.exportLanguages,
    );

    const serverLanguageMapping = hasManagerAccess(project) ? project.data.languageMapping : undefined;
    const branch = await branchService.resolveBranch(options.branch);
    const branchId = branch?.id;

    if (options.dryrun) {
      // Lists the local destination paths (per source × language), not the server source paths:
      // they are exactly the values of the mapping the real download uses. The server file map is
      // loaded even without --all, to drop the target languages a file excludes server-side.
      const projectFiles = this.stripBranchFromPaths((await fileService.loadProjectFiles(branchId)).data, branch?.name);
      const serverSourcePaths = options.all
        ? projectFiles.map((file) => stripLeadingSlashes(file.data.path || ''))
        : undefined;
      const excludedTargetLanguagesByPath = this.buildExcludedTargetLanguagesByPath(projectFiles);

      const mapping = buildTranslationMapping(config, resolvedLanguages, serverLanguageMapping, {
        useServerSources: options.all,
        serverSourcePaths,
        excludedTargetLanguagesByPath,
      });
      const paths = toSortedRelativePaths([...new Set(mapping.byArchivePath.values())]);

      if (!printDryRunPaths(paths, options, output)) {
        output.list(paths, pathView);
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

    if (options.skipUntranslatedStrings && options.skipUntranslatedFiles) {
      throw new CliError(
        'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
      );
    }

    const buildGroups = this.buildExportGroups(config, options, branchId, resolvedLanguageIds, isOrganization, output);
    const projectSkipUntranslatedFiles =
      'skipUntranslatedFiles' in project.data ? Boolean(project.data.skipUntranslatedFiles) : false;

    output.info('Downloading translations');

    let projectFiles: Awaited<ReturnType<typeof fileService.loadProjectFiles>>['data'] | undefined;
    let serverSourcePaths: string[] | undefined;

    if (options.all) {
      if (!config.preserveHierarchy) {
        output.warning(
          "Because the 'preserve_hierarchy' parameter is set to 'false' CLI might download some unexpected " +
            'files that match the pattern',
        );
      }

      projectFiles = this.stripBranchFromPaths((await fileService.loadProjectFiles(branchId)).data, branch?.name);
      serverSourcePaths = projectFiles.map((file) => stripLeadingSlashes(file.data.path || ''));
    }

    const tempDirs: string[] = [];
    const downloadedFiles: DownloadedFile[] = [];
    // One omitted-entry list per build; reported as the cross-build intersection.
    const perBuildOmitted: string[][] = [];
    let anyFileDownloaded = false;
    let skipUntranslatedFilesUsed = projectSkipUntranslatedFiles;

    try {
      for (const [buildIndex, group] of buildGroups.entries()) {
        if (group.request.skipUntranslatedFiles) {
          skipUntranslatedFilesUsed = true;
        }

        const build = group.pseudo
          ? await translationService.buildProjectTranslations(group.pseudo)
          : await translationService.buildProjectTranslations(group.request);

        const downloadUrl = await translationService.getTranslationDownloadUrl(build.data.id);

        const tempDir = await mkdtemp(path.join(tmpdir(), 'crowdin-translations-'));
        tempDirs.push(tempDir);
        const archivePath = path.join(tempDir, 'translations.zip');

        await downloadToFile(downloadUrl, archivePath);

        // Pseudo builds map every project language, ignoring export_languages and --exclude-language.
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

          const archiveRelPath = stripLeadingSlashes(toPosixPath(entry.entryName));
          const localPath = mapping.byArchivePath.get(archiveRelPath);

          if (!localPath) {
            omittedFiles.push(archiveRelPath);
            downloadedFiles.push({
              path: archiveRelPath,
              action: 'skipped',
              reason: 'no matching configuration',
            });
            continue;
          }

          const targetPath = path.join(config.basePath, localPath);

          await mkdir(path.dirname(targetPath), { recursive: true });
          await Bun.write(targetPath, entry.getData());

          anyFileDownloaded = true;
          output.success(`File '${localPath}' extracted`);
          downloadedFiles.push({ path: localPath, action: 'downloaded' });
        }

        perBuildOmitted.push(omittedFiles);

        if (options.keepArchive) {
          const name = buildGroups.length > 1 ? `crowdin-translations-${buildIndex}.zip` : 'crowdin-translations.zip';
          const savedArchivePath = path.join(config.basePath, name);

          await Bun.write(savedArchivePath, Bun.file(archivePath));

          output.success(`Archive saved to '${savedArchivePath}'`);
          // The kept archive is a file this run wrote, so it joins the summary the machine formats
          // render below; success() is text-only.
          downloadedFiles.push({ path: name, action: 'downloaded' });
        }
      }

      // json/toon drop the log() lines this report is made of, leaving a header that promises a list
      // and a --verbose hint that does nothing. Those formats already carry every omitted path in
      // the result document as a skipped entry, so skip the report (and the file fetch it needs).
      if (
        !options.ignoreMatch &&
        !isStructuredFormat(options.output) &&
        perBuildOmitted.some((omitted) => omitted.length > 0)
      ) {
        const files =
          projectFiles ?? this.stripBranchFromPaths((await fileService.loadProjectFiles(branchId)).data, branch?.name);
        const allProjectTranslations = buildAllProjectTranslations(files, projectLanguages, serverLanguageMapping);

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
          output.warning(`Failed to clean up temp directory '${tempDir}'`);
        }
      }
    }

    // Text already streamed a line per file, so only the machine formats need the summary.
    // plain is line-oriented and cannot carry the action, so it lists only what was written.
    //
    // No sort here, unlike sources: this loop is sequential, and adm-zip sorts archive entries.
    if (isMachineFormat(options.output)) {
      output.list(
        isStructuredFormat(options.output)
          ? downloadedFiles
          : downloadedFiles.filter(({ action }) => action !== 'skipped'),
        downloadedFileView,
      );
    }

    output.success('Done');
  };

  /**
   * Builds the list of translation builds to issue. `pseudo` always produces a single all-files
   * build. Otherwise files are grouped by their effective export-option combo so each combo is
   * built once and only its own file groups are mapped from that archive. A CLI flag, when set,
   * forces `true` on every file over the per-file config value; a boolean flag cannot force false.
   *
   * Combo values are tri-state: an unset option is left out of the build request so the project
   * export settings apply, while an explicit `false` is sent and overrides them.
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
      skipUntranslatedStrings: options.skipUntranslatedStrings ? true : file.skip_untranslated_strings,
      skipUntranslatedFiles: options.skipUntranslatedFiles ? true : file.skip_untranslated_files,
      exportApprovedOnly: options.exportOnlyApproved ? true : file.export_only_approved,
      exportStringsThatPassedWorkflow: file.export_strings_that_passed_workflow,
    });

    // Group files by distinct combo, in first-seen order.
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

      if (combo.skipUntranslatedStrings !== undefined) {
        request.skipUntranslatedStrings = combo.skipUntranslatedStrings;
      }

      if (combo.skipUntranslatedFiles !== undefined) {
        request.skipUntranslatedFiles = combo.skipUntranslatedFiles;
      }

      if (isOrganization) {
        // Enterprise has no way to force approvals off, so only `true` maps to a request field.
        if (combo.exportApprovedOnly) {
          request.exportWithMinApprovalsCount = 1;
        }

        if (combo.exportStringsThatPassedWorkflow) {
          request.exportStringsThatPassedWorkflow = true;
        }
      } else {
        if (combo.exportApprovedOnly !== undefined) {
          request.exportApprovedOnly = combo.exportApprovedOnly;
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
   * combo), only files omitted in EVERY build are reported: the per-source translation lists and the
   * without-source list are each intersected. A source absent from any build's omitted set
   * contributes an empty intersection.
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

  /**
   * Drops the branch name that files inside a branch carry in their project path
   * ('/dev/src/en.json' -> '/src/en.json'). Every config-derived path is branch-relative, so without
   * this nothing matches once `--branch` is given. Stripping once at the load boundary keeps every
   * consumer below comparing plain project-relative paths.
   */
  private stripBranchFromPaths<T extends { data: { path?: string } }>(files: T[], branchName?: string): T[] {
    if (!branchName) {
      return files;
    }

    return files.map((file) => ({
      ...file,
      data: { ...file.data, path: stripBranchPrefix(toPosixPath(file.data.path ?? ''), branchName) },
    }));
  }

  /**
   * Resolves which project source files `download sources` fetches, scoping each config group to
   * files matching its `dest ?? source` pattern. With manager access the file's export pattern must
   * also be compatible with the group `translation`. Files matching the group `ignore` patterns are
   * dropped. Each matched file's destination applies `dest`.
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
        const relativePath = stripLeadingSlashes(file.data.path || '');

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
        const relativePath = stripLeadingSlashes(file.data.path || '');
        const destination = this.resolveSourceDestination(patterns, relativePath);

        downloads.push({ fileId: file.data.id, relativePath, destination });
      }
    }

    return downloads;
  }

  /**
   * Computes a source file's local destination. With no `dest` the file keeps its project path.
   * With `dest`: when `dest` has neither `**` nor `%original_path%` and `source` has `**`, the `dest`
   * pattern is applied directly; otherwise the destination is derived from the `source` pattern via
   * `replaceUnaryAsterisk` (substituting the real file segments) — both then resolve file-dependent
   * placeholders.
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
  // languages, so the dry-run listing can skip those languages per file.
  private buildExcludedTargetLanguagesByPath(
    projectFiles: { data: { path?: string; excludedTargetLanguages?: string[] } }[],
  ): Map<string, string[]> {
    const byPath = new Map<string, string[]>();

    for (const file of projectFiles) {
      const excluded = file.data.excludedTargetLanguages;
      if (!excluded || excluded.length === 0) {
        continue;
      }

      byPath.set(stripLeadingSlashes(toPosixPath(file.data.path || '')), excluded);
    }

    return byPath;
  }
}
