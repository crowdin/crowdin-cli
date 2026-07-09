import type { ResponseObject, SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { DirectoryService } from '@/cli/services/DirectoryService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { Output } from '@/cli/utils/output.ts';
import { isPathMatch } from '@/cli/utils/pathMatcher.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { toProjectPath } from '@/lib/utils/path.ts';

export async function deleteObsoleteProjectEntries(
  projectFiles: ResponseObject<SourceFilesModel.File>[],
  projectDirectories: ResponseObject<SourceFilesModel.Directory>[],
  expectedProjectFilePaths: Set<string>,
  sourcePatterns: { source: string; ignore?: string[] }[],
  preserveHierarchy: boolean,
  fileService: FileService,
  directoryService: DirectoryService,
  output: Output,
  dryRun: boolean,
) {
  // Retain every project file the upload would match — including soft (extension-insensitive)
  // matches — so a file that will be updated/renamed is never deleted as obsolete first.
  const projectFilesByPath = new Map(
    projectFiles.map((projectFile) => [toProjectPath(projectFile.data.path), projectFile.data.id]),
  );
  const retainedFileIds = new Set<number>();

  for (const expectedPath of expectedProjectFilePaths) {
    const match = fileLookup(expectedPath, projectFilesByPath);

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
      isManagedBySourcePatterns(toProjectPath(projectFile.data.path), sourcePatterns, preserveHierarchy),
  );

  for (const projectFile of obsoleteFiles) {
    const projectFilePath = toProjectPath(projectFile.data.path);

    if (dryRun) {
      output.info(`File ${projectFilePath} would be deleted as obsolete`);
    } else {
      await fileService.deleteProjectFile(projectFile.data.id, projectFilePath);
      output.success(`File ${projectFilePath} deleted as obsolete`);
    }
  }

  const remainingProjectFilePaths = new Set([
    ...projectFiles
      .filter((projectFile) => !obsoleteFiles.includes(projectFile))
      .map((projectFile) => toProjectPath(projectFile.data.path)),
    ...expectedProjectFilePaths,
  ]);
  const obsoleteDirectories = projectDirectories
    .filter((directory) => !hasFileUnderDirectory(remainingProjectFilePaths, toProjectPath(directory.data.path)))
    .sort((left, right) => right.data.path.length - left.data.path.length);

  for (const directory of obsoleteDirectories) {
    const directoryPath = toProjectPath(directory.data.path);

    if (dryRun) {
      output.info(`Directory ${directoryPath} would be deleted as obsolete`);
    } else {
      await directoryService.deleteProjectDirectory(directory.data.id, directoryPath);
      output.success(`Directory ${directoryPath} deleted as obsolete`);
    }
  }
}

/**
 * Whether a project file path is covered by any configured `source` pattern (and not ignored).
 * With `preserve_hierarchy` the project path keeps its full hierarchy, so it is matched directly.
 * Without it, project paths have their common prefix stripped, so the path is matched against every
 * trailing slice of the source pattern (leading directories optional) — an approximation of Java's
 * ObsoleteSourcesUtils regex with optional leading segments.
 */
function isManagedBySourcePatterns(
  projectPath: string,
  sourcePatterns: { source: string; ignore?: string[] }[],
  preserveHierarchy: boolean,
): boolean {
  return sourcePatterns.some(({ source, ignore }) => {
    if (!matchesPattern(projectPath, source, preserveHierarchy)) {
      return false;
    }

    return !(ignore ?? []).some((ignorePattern) => matchesPattern(projectPath, ignorePattern, preserveHierarchy));
  });
}

function matchesPattern(projectPath: string, pattern: string, preserveHierarchy: boolean): boolean {
  if (preserveHierarchy) {
    return isPathMatch(projectPath, pattern);
  }

  const segments = (pattern.startsWith('/') ? pattern.slice(1) : pattern).split('/');

  for (let index = 0; index < segments.length; index++) {
    if (isPathMatch(projectPath, `/${segments.slice(index).join('/')}`)) {
      return true;
    }
  }

  return false;
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
