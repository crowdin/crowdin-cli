import path from 'node:path';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { ProjectFileIndex } from '@/cli/services/file/ProjectFileIndex.ts';
import { matchesExportPattern, matchesSourcePattern } from '@/lib/config/projectFileMatch.ts';
import type { Config } from '@/lib/config.ts';
import { getExportPattern } from '@/lib/download/projectTranslations.ts';
import { prepareDest } from '@/lib/upload/fileOptions.ts';
import { stripBranchPrefix, stripLeadingSlashes, toProjectPath } from '@/lib/utils/path.ts';

export interface SourceFileOptions {
  labels?: string[];
  excluded_target_languages?: string[];
}

export interface SourcePaths {
  localFilePath: string;
  projectPath: string;
}

interface SourceGroupFiles {
  patterns: Config['files'][number];
  fileOptions: SourceFileOptions;
  files: SourcePaths[];
}

export type SkipReason = 'already uploading' | 'empty' | 'auto-update disabled';

export type PlannedFile =
  | { action: 'create'; paths: SourcePaths }
  | { action: 'update'; paths: SourcePaths; projectFile: SourceFilesModel.File; rename: boolean }
  | { action: 'upload-strings'; paths: SourcePaths }
  | { action: 'skip'; paths: SourcePaths; reason: SkipReason };

export interface PlannedGroup {
  patterns: Config['files'][number];
  fileOptions: SourceFileOptions;
  // Empty when the group's source pattern matched no local file.
  files: PlannedFile[];
}

export interface UploadSourcesPlanInput {
  config: Config;
  groups: SourceGroupFiles[];
  isStringsBased: boolean;
  autoUpdate: boolean;
  deleteObsolete: boolean;
  projectFiles: ProjectFileIndex;
  projectDirectories: SourceFilesModel.Directory[];
  branchName?: string;
}

export interface UploadSourcesPlan {
  groups: PlannedGroup[];
  obsoleteFiles: SourceFilesModel.File[];
  // Branch-relative paths, deepest first so children go before their parents.
  obsoleteDirectories: SourceFilesModel.Directory[];
}

interface PlanContext extends UploadSourcesPlanInput {
  // Project paths of every local source.
  expectedProjectFilePaths: Set<string>;
}

// Decides what an upload sources run will do, without calling the API.
export class UploadSourcesPlanner {
  plan(input: UploadSourcesPlanInput): UploadSourcesPlan {
    const context: PlanContext = {
      ...input,
      expectedProjectFilePaths: new Set(
        input.groups.flatMap(({ files }) => files.map(({ projectPath }) => toProjectPath(projectPath))),
      ),
    };
    const groups = this.planGroups(context);

    if (!input.deleteObsolete) {
      return { groups, obsoleteFiles: [], obsoleteDirectories: [] };
    }

    const obsoleteFiles = this.findObsoleteFiles(context);

    return { groups, obsoleteFiles, obsoleteDirectories: this.findObsoleteDirectories(context, obsoleteFiles) };
  }

  // Groups run in config order, so when two groups resolve to the same project path the first wins.
  private planGroups(context: PlanContext): PlannedGroup[] {
    const seenPaths = new Set<string>();

    return context.groups.map(({ patterns, fileOptions, files }) => ({
      patterns,
      fileOptions,
      files: files.map((paths) => this.planFile(context, paths, seenPaths)),
    }));
  }

  private planFile(context: PlanContext, paths: SourcePaths, seenPaths: Set<string>): PlannedFile {
    if (seenPaths.has(paths.projectPath)) {
      return { action: 'skip', paths, reason: 'already uploading' };
    }

    seenPaths.add(paths.projectPath);

    if (Bun.file(path.join(context.config.basePath, paths.localFilePath)).size === 0) {
      return { action: 'skip', paths, reason: 'empty' };
    }

    if (context.isStringsBased) {
      return { action: 'upload-strings', paths };
    }

    const existing = context.projectFiles.soft(paths.projectPath, context.expectedProjectFilePaths);

    if (!existing) {
      return { action: 'create', paths };
    }

    if (!context.autoUpdate) {
      return { action: 'skip', paths, reason: 'auto-update disabled' };
    }

    return { action: 'update', paths, projectFile: existing.file, rename: !existing.exact };
  }

  private findObsoleteFiles({ config, projectFiles, expectedProjectFilePaths }: PlanContext) {
    // Every file the upload will update or rename, so it's never deleted as obsolete first.
    const retainedFileIds = new Set<number>();

    for (const expectedPath of expectedProjectFilePaths) {
      const match = projectFiles.soft(expectedPath, expectedProjectFilePaths);

      if (match) {
        retainedFileIds.add(match.file.id);
      }
    }

    return projectFiles.files.filter(
      (projectFile) =>
        !retainedFileIds.has(projectFile.id) &&
        this.isManagedByConfig(projectFile.path, getExportPattern(projectFile.exportOptions), config),
    );
  }

  // Only directories that held a deleted file, and their ancestors, are candidates: an empty
  // directory no config references (one made in the Crowdin UI, say) is left alone.
  private findObsoleteDirectories(
    { projectFiles, projectDirectories, expectedProjectFilePaths, branchName }: PlanContext,
    obsoleteFiles: SourceFilesModel.File[],
  ): SourceFilesModel.Directory[] {
    const remainingFilePaths = new Set([
      ...projectFiles.files.filter((file) => !obsoleteFiles.includes(file)).map((file) => file.path),
      ...expectedProjectFilePaths,
    ]);
    const candidates = new Set<string>();

    for (const file of obsoleteFiles) {
      for (let parent = this.parentDirectory(file.path); parent !== ''; parent = this.parentDirectory(parent)) {
        candidates.add(parent);
      }
    }

    return projectDirectories
      .map((directory) => ({ ...directory, path: stripBranchPrefix(directory.path, branchName) }))
      .filter((directory) => candidates.has(directory.path) && !this.hasFileUnder(remainingFilePaths, directory.path))
      .sort((left, right) => right.path.length - left.path.length);
  }

  // A group owns a file when its path pattern (`dest`, if set) matches and it accepts the file's
  // export pattern. matchesSourcePattern, not cli/utils/pathMatcher: only it expands placeholders.
  private isManagedByConfig(
    projectPath: string,
    fileExportPattern: string | undefined,
    { files, preserveHierarchy }: Config,
  ): boolean {
    return files.some(({ source, dest, translation, ignore }) => {
      const pathPattern = dest === undefined ? source : prepareDest(dest, stripLeadingSlashes(source));

      if (!matchesSourcePattern(projectPath, pathPattern, preserveHierarchy)) {
        return false;
      }

      // A file whose translations land outside this group's `translation` belongs to another group.
      if (!matchesExportPattern(fileExportPattern, translation, preserveHierarchy)) {
        return false;
      }

      return !(ignore ?? []).some((ignorePattern) =>
        matchesSourcePattern(projectPath, ignorePattern, preserveHierarchy),
      );
    });
  }

  // Parent of a project path, or '' at the root.
  private parentDirectory(projectPath: string): string {
    const absolutePath = toProjectPath(projectPath);
    const lastSeparator = absolutePath.lastIndexOf('/');

    return lastSeparator <= 0 ? '' : absolutePath.slice(0, lastSeparator);
  }

  private hasFileUnder(filePaths: Set<string>, directoryPath: string): boolean {
    const prefix = `${toProjectPath(directoryPath).replace(/\/$/, '')}/`;

    for (const filePath of filePaths) {
      if (toProjectPath(filePath).startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }
}
