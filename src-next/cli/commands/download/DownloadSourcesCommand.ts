import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import { printDryRunPaths } from '@/cli/commands/common/dryRunPaths.ts';
import { EXECUTION_FINISHED_WITH_ERRORS, reportFailures } from '@/cli/commands/common/failures.ts';
import { pathView } from '@/cli/commands/common/views.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { GetBranchService, GetConfig, GetFileService, GetOutput, GetProjectService } from '@/cli/services.ts';
import { downloadToFile, withDownloadedArchive } from '@/cli/utils/downloadToFile.ts';
import { isMachineFormat, isStructuredFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';
import { matchesManagerSourceFile, matchesSourcePattern, replaceUnaryAsterisk } from '@/lib/config/projectFileMatch.ts';
import { assertFilesConfigured, type Config } from '@/lib/config.ts';
import { getExportPattern } from '@/lib/download/projectTranslations.ts';
import { originalPath } from '@/lib/export/patterns.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
import { FILE_MANAGEMENT_UNAVAILABLE, isStringsBasedProject } from '@/lib/project/type.ts';
import { prepareDest } from '@/lib/upload/fileOptions.ts';
import { runConcurrently } from '@/lib/utils/concurrency.ts';
import { stripBranchPrefix, stripLeadingSlashes, toPosixPath, toSortedRelativePaths } from '@/lib/utils/path.ts';
import { type DownloadedFile, downloadedFileView } from './views.ts';

interface SourcesOptions extends GlobalOptions {
  branch?: string;
  reviewed?: boolean;
  dryrun?: boolean;
}

interface SourceDownload {
  fileId: number;
  relativePath: string;
  destination: string;
}

export default class DownloadSourcesCommand {
  constructor(
    private getConfig: GetConfig,
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
  ) {}

  action = async (command: Command) => {
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

    if (isStringsBasedProject(project)) {
      throw new CliError(FILE_MANAGEMENT_UNAVAILABLE);
    }

    const branch = await branchService.resolveBranch(options.branch);
    const downloads = this.collectSourceDownloads(
      config,
      await fileService.loadBranchRelativeFiles(branch),
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

    if (options.reviewed) {
      await this.downloadReviewedSources(
        fileService,
        config,
        downloads,
        branch,
        project.sourceLanguageId,
        options,
        output,
      );
      return;
    }

    const downloadedFiles: DownloadedFile[] = [];
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

  private async downloadReviewedSources(
    fileService: FileService,
    config: Config,
    downloads: SourceDownload[],
    branch: SourceFilesModel.Branch | undefined,
    sourceLanguageId: string,
    options: SourcesOptions,
    output: Output,
  ): Promise<void> {
    const downloadedFiles: DownloadedFile[] = [];
    const build = await fileService.buildReviewedSources(branch?.id);
    const downloadUrl = await fileService.getReviewedSourcesDownloadUrl(build.id);

    await withDownloadedArchive(downloadUrl, 'crowdin-reviewed-sources-', output, async (archivePath) => {
      const reviewedFiles = this.readReviewedArchive(archivePath, sourceLanguageId, branch?.name);

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
    });

    // Text already streamed a line per file, so only the machine formats need the summary.
    // plain is line-oriented and cannot carry the action, so it lists only what was written.
    if (isMachineFormat(options.output)) {
      const sorted = downloadedFiles.sort((one, other) => one.path.localeCompare(other.path));

      output.list(
        isStructuredFormat(options.output) ? sorted : sorted.filter(({ action }) => action !== 'skipped'),
        downloadedFileView,
      );
    }
  }

  /**
   * The reviewed archive nests every file under a `<source_language_id>-REV` directory; strip that
   * prefix so keys line up with the project file paths.
   */
  private readReviewedArchive(
    archivePath: string,
    sourceLanguageId: string,
    branchName: string | undefined,
  ): Map<string, Uint8Array> {
    const prefix = `${sourceLanguageId}-REV`;
    const reviewedFiles = new Map<string, Uint8Array>();

    for (const entry of new AdmZip(archivePath).getEntries()) {
      if (entry.isDirectory) {
        continue;
      }

      const name = stripLeadingSlashes(toPosixPath(entry.entryName));

      if (!name.startsWith(`${prefix}/`)) {
        continue;
      }

      reviewedFiles.set(stripBranchPrefix(name.slice(prefix.length), branchName), entry.getData());
    }

    return reviewedFiles;
  }

  /**
   * Resolves which project source files `download sources` fetches, scoping each config group to
   * files matching its `dest ?? source` pattern. With manager access the file's export pattern must
   * also be compatible with the group `translation`. Files matching the group `ignore` patterns are
   * dropped. Each matched file's destination applies `dest`.
   */
  private collectSourceDownloads(
    config: Config,
    projectFiles: SourceFilesModel.File[],
    managerAccess: boolean,
    output: Output,
  ): SourceDownload[] {
    const downloads: SourceDownload[] = [];

    for (const patterns of config.files) {
      const searchPattern = patterns.dest ?? patterns.source;
      const ignore = patterns.ignore ?? [];

      const matched = projectFiles.filter((file) => {
        const relativePath = stripLeadingSlashes(file.path);

        if (!matchesSourcePattern(relativePath, searchPattern, config.preserveHierarchy)) {
          return false;
        }

        if (ignore.some((pattern) => matchesSourcePattern(relativePath, pattern, config.preserveHierarchy))) {
          return false;
        }

        if (managerAccess) {
          const exportPattern = getExportPattern(file.exportOptions);

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

      const sorted = [...matched].sort((a, b) => a.path.localeCompare(b.path));

      for (const file of sorted) {
        const relativePath = stripLeadingSlashes(file.path);
        const destination = this.resolveSourceDestination(patterns, relativePath);

        downloads.push({ fileId: file.id, relativePath, destination });
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
}
