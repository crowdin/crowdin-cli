import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  LanguagesModel,
  ProjectsGroupsModel,
  SourceFilesModel,
  TranslationsModel,
} from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import { reportNoManagerAccess } from '@/cli/commands/common/managerAccess.ts';
import { pathView } from '@/cli/commands/common/views.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import type {
  GetBranchService,
  GetConfig,
  GetFileService,
  GetOutput,
  GetProjectService,
  GetTranslationService,
} from '@/cli/services.ts';
import { withDownloadedArchive } from '@/cli/utils/downloadToFile.ts';
import { isMachineFormat, isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { resolveDownloadLanguages } from '@/lib/download/languages.ts';
import { buildAllProjectTranslations } from '@/lib/download/projectTranslations.ts';
import { buildTranslationMapping } from '@/lib/download/translationMapping.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { FILE_MANAGEMENT_UNAVAILABLE, isStringsBasedProject } from '@/lib/project/type.ts';
import { stripLeadingSlashes, toPosixPath, toSortedRelativePaths } from '@/lib/utils/path.ts';
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

interface ExportCombo {
  skipUntranslatedStrings?: boolean;
  skipUntranslatedFiles?: boolean;
  exportApprovedOnly?: boolean;
  exportStringsThatPassedWorkflow?: boolean;
}

interface OmittedFiles {
  /** omitted translation paths grouped by the project source path they belong to. */
  withSources: Map<string, string[]>;
  /** omitted translation paths with no matching project source. */
  withoutSources: string[];
}

interface ExportGroup {
  files: Config['files'];
  request: TranslationsModel.BuildRequest;
  pseudo?: TranslationsModel.PseudoBuildRequest;
}

// What every build of one translations download shares.
interface TranslationsRun {
  options: TranslationsOptions;
  config: Config;
  output: Output;
  translationService: TranslationService;
  projectLanguages: LanguagesModel.Language[];
  resolvedLanguages: LanguagesModel.Language[];
  serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined;
  serverSourcePaths: string[] | undefined;
  downloadedFiles: DownloadedFile[];
  // One omitted-entry list per build; reported as the cross-build intersection.
  perBuildOmitted: string[][];
  anyFileDownloaded: boolean;
}

export default class DownloadTranslationsCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
    private getTranslationService: GetTranslationService,
  ) {}

  action = async (command: Command) => {
    const options = command.optsWithGlobals() as TranslationsOptions;
    const config = await this.getConfig(command);
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const fileService = await this.getFileService(command);
    const branchService = await this.getBranchService(command);
    const translationService = await this.getTranslationService(command);

    assertFilesConfigured(config);

    const project = await projectService.loadProject();

    if (isStringsBasedProject(project)) {
      throw new CliError(FILE_MANAGEMENT_UNAVAILABLE);
    }

    if (!hasManagerAccess(project)) {
      reportNoManagerAccess(output, options.output);
      return;
    }

    const inContextPseudoLanguage = 'inContextPseudoLanguage' in project ? project.inContextPseudoLanguage : undefined;
    const projectLanguages = inContextPseudoLanguage
      ? [...project.targetLanguages, inContextPseudoLanguage]
      : project.targetLanguages;
    const { languages: resolvedLanguages, languageIds: resolvedLanguageIds } = resolveDownloadLanguages(
      projectLanguages,
      options,
      config.exportLanguages,
    );

    const serverLanguageMapping = project.languageMapping;
    const branch = await branchService.resolveBranch(options.branch);

    if (options.dryrun) {
      this.printDryRunTranslations(
        config,
        options,
        output,
        await fileService.loadBranchRelativeFiles(branch),
        resolvedLanguages,
        serverLanguageMapping,
      );
      return;
    }

    output.info(this.buildingMessage(options, resolvedLanguageIds));

    const isOrganization = projectService.isEnterprise();
    const buildGroups = this.buildExportGroups(
      config,
      options,
      branch?.id,
      resolvedLanguageIds,
      isOrganization,
      output,
    );
    const projectSkipUntranslatedFiles =
      'skipUntranslatedFiles' in project ? Boolean(project.skipUntranslatedFiles) : false;
    const skipUntranslatedFilesUsed = buildGroups.some(
      (group) => group.request.skipUntranslatedFiles ?? projectSkipUntranslatedFiles,
    );

    output.info('Downloading translations');

    let projectFiles: SourceFilesModel.File[] | undefined;

    if (options.all) {
      if (!config.preserveHierarchy) {
        output.warning(
          "Because the 'preserve_hierarchy' parameter is set to 'false' CLI might download some unexpected " +
            'files that match the pattern',
        );
      }

      projectFiles = await fileService.loadBranchRelativeFiles(branch);
    }

    const run: TranslationsRun = {
      options,
      config,
      output,
      translationService,
      projectLanguages,
      resolvedLanguages,
      serverLanguageMapping,
      serverSourcePaths: projectFiles?.map((file) => stripLeadingSlashes(file.path)),
      downloadedFiles: [],
      perBuildOmitted: [],
      anyFileDownloaded: false,
    };

    for (const [buildIndex, group] of buildGroups.entries()) {
      const archiveName =
        buildGroups.length > 1 ? `crowdin-translations-${buildIndex}.zip` : 'crowdin-translations.zip';

      await this.downloadBuild(run, group, archiveName);
    }

    // The machine formats drop the log() lines this report is made of, leaving a header that
    // promises a list and a --verbose hint that does nothing, so skip the report (and the file
    // fetch it needs). json/toon already carry every omitted path in the result document as a
    // skipped entry; plain lists only what was written.
    if (
      !options.ignoreMatch &&
      !isMachineFormat(options.output) &&
      run.perBuildOmitted.some((omitted) => omitted.length > 0)
    ) {
      const files = projectFiles ?? (await fileService.loadBranchRelativeFiles(branch));
      const allProjectTranslations = buildAllProjectTranslations(files, projectLanguages, serverLanguageMapping);

      this.reportOmittedFiles(run.perBuildOmitted, allProjectTranslations, output, options.verbose ?? false);
    }

    if (!run.anyFileDownloaded) {
      if (skipUntranslatedFilesUsed) {
        output.warning(
          "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, " +
            'please make sure you have fully translated files',
        );
      } else {
        throw new CliError("Couldn't find any file to download");
      }
    }

    // Text already streamed a line per file, so only the machine formats need the summary.
    // plain is line-oriented and cannot carry the action, so it lists only what was written.
    //
    // No sort here, unlike sources: this loop is sequential, and adm-zip sorts archive entries.
    if (isMachineFormat(options.output)) {
      output.list(
        isStructuredFormat(options.output)
          ? run.downloadedFiles
          : run.downloadedFiles.filter(({ action }) => action !== 'skipped'),
        downloadedFileView,
      );
    }

    output.success('Done');
  };

  // Lists the local destination paths (per source × language), not the server source paths: they
  // are exactly the values of the mapping the real download uses. The server file map is needed
  // even without --all, to drop the target languages a file excludes server-side.
  private printDryRunTranslations(
    config: Config,
    options: TranslationsOptions,
    output: Output,
    projectFiles: SourceFilesModel.File[],
    languages: LanguagesModel.Language[],
    serverLanguageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
  ): void {
    const mapping = buildTranslationMapping(config, languages, serverLanguageMapping, {
      useServerSources: options.all,
      serverSourcePaths: options.all ? projectFiles.map((file) => stripLeadingSlashes(file.path)) : undefined,
      excludedTargetLanguagesByPath: this.buildExcludedTargetLanguagesByPath(projectFiles),
    });
    const paths = toSortedRelativePaths([...new Set(mapping.byArchivePath.values())]);

    if (!printDryRunPaths(paths, options, output)) {
      output.list(paths, pathView);
    }
  }

  private buildingMessage(options: TranslationsOptions, languageIds: string[] | undefined): string {
    if (options.pseudo) {
      return 'Building pseudo translations';
    }

    if (languageIds && languageIds.length > 0) {
      return `Building translations for languages: ${languageIds.join(', ')}`;
    }

    return 'Building translations';
  }

  private async downloadBuild(run: TranslationsRun, group: ExportGroup, archiveName: string): Promise<void> {
    const { options, config, output, translationService } = run;
    const build = await translationService.buildProjectTranslations(group.pseudo ?? group.request);
    const downloadUrl = await translationService.getTranslationDownloadUrl(build.id);

    await withDownloadedArchive(downloadUrl, 'crowdin-translations-', output, async (archivePath) => {
      // Pseudo builds map every project language, ignoring export_languages and --exclude-language.
      const mappingLanguages = group.pseudo ? run.projectLanguages : run.resolvedLanguages;
      const mapping = buildTranslationMapping(config, mappingLanguages, run.serverLanguageMapping, {
        useServerSources: options.all,
        serverSourcePaths: run.serverSourcePaths,
        files: group.files,
      });

      run.perBuildOmitted.push(await this.extractArchive(run, archivePath, mapping.byArchivePath));

      if (options.keepArchive) {
        const savedArchivePath = path.join(config.basePath, archiveName);

        await Bun.write(savedArchivePath, Bun.file(archivePath));

        output.success(`Archive saved to '${savedArchivePath}'`);
        // The kept archive is a file this run wrote, so it joins the summary the machine formats
        // render below; success() is text-only.
        run.downloadedFiles.push({ path: archiveName, action: 'downloaded' });
      }
    });
  }

  // Writes every entry the mapping knows and returns the archive paths it doesn't.
  private async extractArchive(
    run: TranslationsRun,
    archivePath: string,
    byArchivePath: Map<string, string>,
  ): Promise<string[]> {
    const omittedFiles: string[] = [];

    for (const entry of new AdmZip(archivePath).getEntries()) {
      if (entry.isDirectory) {
        continue;
      }

      const archiveRelPath = stripLeadingSlashes(toPosixPath(entry.entryName));
      const localPath = byArchivePath.get(archiveRelPath);

      if (!localPath) {
        omittedFiles.push(archiveRelPath);
        run.downloadedFiles.push({
          path: archiveRelPath,
          action: 'skipped',
          reason: 'no matching configuration',
        });
        continue;
      }

      const targetPath = path.join(run.config.basePath, localPath);

      await mkdir(path.dirname(targetPath), { recursive: true });
      await Bun.write(targetPath, entry.getData());

      run.anyFileDownloaded = true;
      run.output.success(`File '${localPath}' extracted`);
      run.downloadedFiles.push({ path: localPath, action: 'downloaded' });
    }

    return omittedFiles;
  }

  /**
   * Builds the list of translation builds to issue. `pseudo` always produces a single all-files
   * build. Otherwise files are grouped by their effective export-option combo so each combo is
   * built once and only its own file groups are mapped from that archive. A CLI flag, `--x` or
   * `--no-x`, overrides the per-file config value on every file.
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
  ): ExportGroup[] {
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
      skipUntranslatedStrings: options.skipUntranslatedStrings ?? file.skip_untranslated_strings,
      skipUntranslatedFiles: options.skipUntranslatedFiles ?? file.skip_untranslated_files,
      exportApprovedOnly: options.exportOnlyApproved ?? file.export_only_approved,
      exportStringsThatPassedWorkflow: file.export_strings_that_passed_workflow,
    });

    // Group files by distinct combo, in first-seen order.
    const groups = new Map<string, { combo: ExportCombo; files: Config['files'] }>();

    for (const file of config.files) {
      const combo = effectiveCombo(file);

      if (combo.skipUntranslatedStrings && combo.skipUntranslatedFiles) {
        throw new CliError(
          'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
        );
      }

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
        if (combo.exportApprovedOnly !== undefined) {
          request.exportWithMinApprovalsCount = combo.exportApprovedOnly ? 1 : 0;
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
   * combo), only files omitted in EVERY build are reported.
   */
  private reportOmittedFiles(
    perBuildOmitted: string[][],
    allProjectTranslations: Map<string, string[]>,
    output: Output,
    verbose: boolean,
  ): void {
    const { withSources, withoutSources } = this.intersectOmittedFiles(
      perBuildOmitted.map((omitted) => this.sortOmittedFiles(omitted, allProjectTranslations)),
    );
    const faqLink = 'Visit the https://crowdin.github.io/crowdin-cli/faq for more details';

    if (withSources.size > 0) {
      output.warning(
        "Downloaded translations don't match the current project configuration. The translations for the " +
          'following sources will be omitted (use --verbose to get the list of the omitted translations):',
      );

      for (const [source, translations] of withSources) {
        output.log(`\t- ${source} (${translations.length})`);

        if (verbose) {
          for (const translation of translations) {
            output.log(`\t\t- ${translation}`);
          }
        }
      }

      output.log(faqLink);
    }

    if (withoutSources.length > 0) {
      output.warning('Due to missing respective sources, the following translations will be omitted:');

      for (const file of withoutSources) {
        output.log(`\t- ${file}`);
      }

      output.log(faqLink);
    }
  }

  /**
   * Splits omitted archive entries into those that correspond to a known project source (grouped by
   * source) and those without a source.
   */
  private sortOmittedFiles(omittedFiles: string[], allProjectTranslations: Map<string, string[]>): OmittedFiles {
    const withSources = new Map<string, string[]>();
    const withoutSources: string[] = [];

    for (const omittedFile of omittedFiles) {
      let found = false;

      for (const [sourcePath, translations] of allProjectTranslations) {
        if (translations.includes(omittedFile)) {
          found = true;
          const bucket = withSources.get(sourcePath) ?? [];
          bucket.push(omittedFile);
          withSources.set(sourcePath, bucket);
        }
      }

      if (!found) {
        withoutSources.push(omittedFile);
      }
    }

    return { withSources, withoutSources };
  }

  /**
   * Keeps only what every build omitted. Each build exports a different subset of files, so an entry
   * omitted by one build may have been written by another.
   */
  private intersectOmittedFiles(perBuild: OmittedFiles[]): OmittedFiles {
    const [first, ...rest] = perBuild;
    const withSources = new Map<string, string[]>();

    for (const [source, translations] of first?.withSources ?? []) {
      const common = translations.filter((translation) =>
        rest.every((build) => build.withSources.get(source)?.includes(translation)),
      );

      if (common.length > 0) {
        withSources.set(source, common);
      }
    }

    return {
      withSources,
      withoutSources: (first?.withoutSources ?? []).filter((file) =>
        rest.every((build) => build.withoutSources.includes(file)),
      ),
    };
  }

  // Maps each server source path (basePath-relative posix, no leading slash) to its excluded target
  // languages, so the dry-run listing can skip those languages per file.
  private buildExcludedTargetLanguagesByPath(projectFiles: SourceFilesModel.File[]): Map<string, string[]> {
    const byPath = new Map<string, string[]>();

    for (const file of projectFiles) {
      const excluded = file.excludedTargetLanguages;
      if (!excluded || excluded.length === 0) {
        continue;
      }

      byPath.set(stripLeadingSlashes(toPosixPath(file.path)), excluded);
    }

    return byPath;
  }
}
