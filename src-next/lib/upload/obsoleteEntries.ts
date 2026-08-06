import type { ResponseObject, SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { Output } from '@/cli/utils/output.ts';
import { isPathMatch } from '@/cli/utils/pathMatcher.ts';
import { matchesExportPattern } from '@/lib/config/projectFileMatch.ts';
import { getExportPattern } from '@/lib/download/projectTranslations.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { stripBranchPrefix, stripLeadingSlashes, toProjectPath } from '@/lib/utils/path.ts';

export async function deleteObsoleteProjectEntries(
  projectFiles: ResponseObject<SourceFilesModel.File>[],
  projectDirectories: ResponseObject<SourceFilesModel.Directory>[],
  expectedProjectFilePaths: Set<string>,
  sourcePatterns: { source: string; translation: string; ignore?: string[] }[],
  preserveHierarchy: boolean,
  fileService: FileService,
  directoryService: DirectoryService,
  output: Output,
  dryRun: boolean,
  branchName?: string,
) {
  // Server paths carry the branch name; expectedProjectFilePaths (and the source patterns matched
  // below) never do, so drop it before comparing. Java uses the branch-less path map here too.
  const stripBranch = (projectPath: string) => stripBranchPrefix(projectPath, branchName);
  // Retain every project file the upload would match — including soft (extension-insensitive)
  // matches — so a file that will be updated/renamed is never deleted as obsolete first.
  const projectFilesByPath = new Map(
    projectFiles.map((projectFile) => [stripBranch(projectFile.data.path), projectFile.data.id]),
  );
  const retainedFileIds = new Set<number>();

  for (const expectedPath of expectedProjectFilePaths) {
    const match = fileLookup(expectedPath, projectFilesByPath, expectedProjectFilePaths);

    if (match) {
      retainedFileIds.add(match.id);
    }
  }

  // Only delete files that fall under a configured `source` pattern (and aren't ignored). This
  // scopes deletion to files this config manages, mirroring Java's ObsoleteSourcesUtils — files
  // outside every source pattern are left untouched.
  const obsoleteFiles = projectFiles.filter(
    (projectFile) =>
      !retainedFileIds.has(projectFile.data.id) &&
      isManagedBySourcePatterns(
        stripBranch(projectFile.data.path),
        getExportPattern(projectFile.data.exportOptions),
        sourcePatterns,
        preserveHierarchy,
      ),
  );

  for (const projectFile of obsoleteFiles) {
    const projectFilePath = stripBranch(projectFile.data.path);
    // Java reports obsolete paths relative (Dryrun strips leading separators, and the
    // sub-action's path map is built without one).
    const displayPath = stripLeadingSlashes(projectFilePath);

    if (dryRun) {
      output.info(`'${displayPath}' file would be deleted`);
    } else {
      await fileService.deleteProjectFile(projectFile.data.id, projectFilePath);
      output.success(`'${displayPath}' file was deleted`);
    }
  }

  const remainingProjectFilePaths = new Set([
    ...projectFiles
      .filter((projectFile) => !obsoleteFiles.includes(projectFile))
      .map((projectFile) => stripBranch(projectFile.data.path)),
    ...expectedProjectFilePaths,
  ]);
  // Java only ever considers directories that held a file it just deleted, plus their ancestors
  // (ObsoleteSourcesUtils.findObsoleteProjectDirectories builds its candidates from
  // obsoleteDeletedProjectFiles). Scanning every project directory instead would delete empty
  // directories that no config references — ones a manager created in the Crowdin UI, say.
  const obsoleteDirectoryCandidates = new Set<string>();

  for (const projectFile of obsoleteFiles) {
    let parent = parentDirectory(stripBranch(projectFile.data.path));

    while (parent !== '') {
      obsoleteDirectoryCandidates.add(parent);
      parent = parentDirectory(parent);
    }
  }

  const obsoleteDirectories = projectDirectories
    .filter((directory) => {
      const directoryPath = stripBranch(directory.data.path);

      return (
        obsoleteDirectoryCandidates.has(directoryPath) &&
        !hasFileUnderDirectory(remainingProjectFilePaths, directoryPath)
      );
    })
    .sort((left, right) => right.data.path.length - left.data.path.length);

  for (const directory of obsoleteDirectories) {
    const directoryPath = stripBranch(directory.data.path);
    const displayPath = `${stripLeadingSlashes(directoryPath)}/`;

    if (dryRun) {
      output.info(`'${displayPath}' directory would be deleted`);
    } else {
      await directoryService.deleteProjectDirectory(directory.data.id, directoryPath);
      output.success(`'${displayPath}' directory was deleted`);
    }
  }

  if (!dryRun) {
    if (obsoleteFiles.length === 0) {
      output.success('No obsolete files were found');
    }

    if (obsoleteDirectories.length === 0) {
      output.success('No obsolete directories found');
    }
  }
}

/**
 * Whether a project file is covered by any configured group (and not ignored). Java runs this per
 * group (`DeleteObsoleteProjectFilesSubAction.act`), so `source` and `translation` stay paired: a
 * file only counts as managed when the same group both matches its path and accepts its stored
 * export pattern (`ObsoleteSourcesUtils.checkExportPattern`).
 *
 * With `preserve_hierarchy` the project path keeps its full hierarchy, so it is matched directly.
 * Without it, project paths have their common prefix stripped, so the path is matched against every
 * trailing slice of the source pattern (leading directories optional) — an approximation of Java's
 * ObsoleteSourcesUtils regex with optional leading segments.
 */
function isManagedBySourcePatterns(
  projectPath: string,
  fileExportPattern: string | undefined,
  sourcePatterns: { source: string; translation: string; ignore?: string[] }[],
  preserveHierarchy: boolean,
): boolean {
  return sourcePatterns.some(({ source, translation, ignore }) => {
    if (!matchesPattern(projectPath, source, preserveHierarchy)) {
      return false;
    }

    // A file whose translations land outside this group's `translation` belongs to another group;
    // deleting it here would destroy translations Java keeps.
    if (!matchesExportPattern(fileExportPattern, translation, preserveHierarchy)) {
      return false;
    }

    return !(ignore ?? []).some((ignorePattern) => matchesPattern(projectPath, ignorePattern, preserveHierarchy));
  });
}

function matchesPattern(projectPath: string, pattern: string, preserveHierarchy: boolean): boolean {
  if (preserveHierarchy) {
    return isPathMatch(projectPath, pattern);
  }

  const segments = stripLeadingSlashes(pattern).split('/');

  for (let index = 0; index < segments.length; index++) {
    if (isPathMatch(projectPath, `/${segments.slice(index).join('/')}`)) {
      return true;
    }
  }

  return false;
}

/** Parent of a project path, or '' at the root (mirrors the walk in Utils.getParentDirectory). */
function parentDirectory(projectPath: string): string {
  const lastSeparator = toProjectPath(projectPath).lastIndexOf('/');

  return lastSeparator <= 0 ? '' : toProjectPath(projectPath).slice(0, lastSeparator);
}

function hasFileUnderDirectory(filePaths: Set<string>, directoryPath: string): boolean {
  const normalizedDirectoryPath = toProjectPath(directoryPath);
  const prefix = normalizedDirectoryPath.endsWith('/') ? normalizedDirectoryPath : `${normalizedDirectoryPath}/`;

  for (const filePath of filePaths) {
    if (toProjectPath(filePath).startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
