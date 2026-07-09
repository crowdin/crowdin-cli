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

/**
 * Ensures a Crowdin project path is absolute (leading '/'), the form the API and
 * path comparisons expect.
 */
export function toProjectPath(filePath: string): string {
  return filePath.startsWith('/') ? filePath : `/${filePath}`;
}

/**
 * Removes leading path separators (both '/' and '\\', repeated) so a project path
 * renders as a relative path. Mirrors Java's `replaceAll("^[/\\\\]+", "")`.
 */
export function stripLeadingSlashes(path: string): string {
  return path.replace(/^[/\\]+/, '');
}

/**
 * Normalizes a list of project paths to sorted, leading-slash-stripped relatives.
 * Mirrors Java's Dryrun list rendering (strip + sort before printing).
 */
export function toSortedRelativePaths(paths: string[]): string[] {
  return paths.map(stripLeadingSlashes).sort();
}
