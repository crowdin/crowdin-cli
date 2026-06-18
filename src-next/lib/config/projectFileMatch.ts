import { toPosixPath } from '../utils/path.ts';

/**
 * Translates a single source/translation glob pattern (or path segment) into a regex source string,
 * mirroring Java's PlaceholderUtil.formatSourcePatternForRegex: `**` matches across separators,
 * `*` matches within a segment, `?` matches a single non-separator character, and the file
 * placeholders collapse to wildcards. Language placeholders are left literal so they match the
 * literal placeholder text present on both sides.
 */
export function globToRegex(pattern: string): string {
  let result = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i] as string;

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        result += '.+';
        i++;
      } else {
        result += '[^/]+';
      }
      continue;
    }

    if (char === '?') {
      result += '[^/]';
      continue;
    }

    // Escape regex metacharacters so the rest of the pattern matches literally.
    if ('.+^${}()|[]\\'.includes(char)) {
      result += `\\${char}`;
      continue;
    }

    result += char;
  }

  return result
    .replaceAll('%file_extension%', '[^/]+')
    .replaceAll('%file_name%', '[^/]+')
    .replaceAll('%original_file_name%', '[^/]+')
    .replaceAll('%original_path%', '.+');
}

/**
 * Decides whether a project file path matches a config group's source pattern, mirroring Java's
 * SourcesUtils.filterProjectFiles.
 *
 * - `preserveHierarchy` true: the whole pattern must match the whole path.
 * - `preserveHierarchy` false: only the trailing path segments need to match the pattern segments
 *   (leading directories are optional), e.g. pattern `a/b/c` matches `c`, `b/c`, or `a/b/c`.
 */
export function matchesSourcePattern(filePath: string, sourcePattern: string, preserveHierarchy: boolean): boolean {
  const normalizedPath = stripLeadingSlash(toPosixPath(filePath));
  const normalizedPattern = stripLeadingSlash(toPosixPath(sourcePattern));

  if (preserveHierarchy) {
    return new RegExp(`^${globToRegex(normalizedPattern)}$`).test(normalizedPath);
  }

  const segments = normalizedPattern.split('/').map(globToRegex);

  // Make leading segments optional so a shorter path matches the trailing pattern segments,
  // e.g. pattern `a/b/c` -> `^((a/)?b/)?c$` matches `c`, `b/c`, or `a/b/c`.
  let body = '';
  for (let i = 0; i < segments.length - 1; i++) {
    body = `(${body}${segments[i]}/)?`;
  }
  body += segments[segments.length - 1];

  return new RegExp(`^${body}$`).test(normalizedPath);
}

/**
 * Decides whether a project file's export pattern is compatible with a config group's translation
 * pattern, mirroring Java's ObsoleteSourcesUtils.checkExportPattern. When the project file has no
 * export pattern the check passes (nothing to contradict).
 */
export function matchesExportPattern(
  fileExportPattern: string | undefined,
  translationPattern: string,
  preserveHierarchy: boolean,
): boolean {
  if (!fileExportPattern) {
    return true;
  }

  return matchesSourcePattern(fileExportPattern, translationPattern, preserveHierarchy);
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}
