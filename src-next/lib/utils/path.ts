/**
 * Converts backslash path separators to forward slashes.
 *
 * Crowdin project paths always use '/' regardless of OS. Use this whenever
 * a path originates from the local filesystem (glob results, CLI arguments)
 * and needs to be compared against or sent to the Crowdin API.
 */
export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

export function collapseSeparators(path: string): string {
  return path.replace(/[\\/]+/g, '/');
}

/**
 * Ensures a Crowdin project path is absolute (leading '/'), the form the API and
 * path comparisons expect.
 */
export function toProjectPath(filePath: string): string {
  return filePath.startsWith('/') ? filePath : `/${filePath}`;
}

/**
 * Strips the branch name a Crowdin project path carries for files inside a branch
 * (`/dev/sources/en.json` -> `/sources/en.json`).
 *
 * Local paths resolved from the config never carry the branch, so every comparison
 * between a server path and a config-derived path has to drop it first.
 */
export function stripBranchPrefix(projectPath: string, branchName?: string): string {
  if (!branchName) {
    return projectPath;
  }

  const absolutePath = toProjectPath(projectPath);
  const prefix = `/${branchName}/`;

  return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length - 1) : absolutePath;
}

/**
 * Removes leading path separators (both '/' and '\\', repeated) so a project path
 * renders as a relative path.
 */
export function stripLeadingSlashes(path: string): string {
  return path.replace(/^[/\\]+/, '');
}

/** Removes trailing path separators (both '/' and '\\', repeated). */
export function stripTrailingSlashes(path: string): string {
  return path.replace(/[/\\]+$/, '');
}

/**
 * Normalizes a list of project paths to sorted, leading-slash-stripped relatives.
 */
export function toSortedRelativePaths(paths: string[]): string[] {
  return paths.map(stripLeadingSlashes).sort();
}

/**
 * Turns an entity name from the API (a glossary, TM or style guide) into a single file name for the
 * current directory. Separators become '_' so a name like '../outside' or 'UI/UX' can't point the
 * write anywhere else, and so do the characters Windows rejects in file names.
 */
export function toSafeFileName(name: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are not valid in file names
  return name.replace(/[/\\:*?"<>|\x00-\x1f]/g, '_');
}
