import { replaceDoubleAsterisk } from '../utils/doubleAsterisk.ts';
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

/**
 * Mirrors Java SourcesUtils.containsPattern: whether a pattern contains glob metacharacters.
 */
export function containsPattern(pattern: string): boolean {
  return (
    pattern.includes('**') ||
    pattern.includes('*') ||
    pattern.includes('?') ||
    (pattern.includes('[') && pattern.includes(']')) ||
    pattern.includes('\\')
  );
}

/**
 * Replicates DownloadSourcesAction's manager-access pre-filter for one project file: decides whether
 * the file's server export pattern is compatible with the config group, so that with manager access
 * only files whose translations belong to the group are downloaded. Returns true to KEEP the file.
 *
 * - `preserveHierarchy` false: the group `translation` (with each `/**` made optional) must partially
 *   match the export pattern (Java's `Pattern.asPredicate`).
 * - `preserveHierarchy` true: when `dest` is set the file path must match the `dest` glob; otherwise
 *   the file's export pattern (when present) must be a suffix of the group `translation` after `**` is
 *   expanded from the project file path. A matched file is then additionally gated by Java's
 *   `sourceName == fileName || containsPattern(sourceName) || searchPattern.contains(path)` condition.
 */
export function matchesManagerSourceFile(
  fileBean: { source: string; translation: string; dest?: string },
  filePath: string,
  exportPattern: string | undefined,
  searchPattern: string,
  preserveHierarchy: boolean,
): boolean {
  const normalizedExport = exportPattern !== undefined ? normalizePath(exportPattern) : undefined;

  if (!preserveHierarchy) {
    if (normalizedExport === undefined) {
      return true;
    }

    // `/**` -> optional `(/.+)?`; placeholders stay literal. Partial match like Java asPredicate.
    const prepared = fileBean.translation.replace(/[\\/]\*\*/g, '(/.+)?').replace(/\\/g, '\\\\');
    return new RegExp(prepared).test(normalizedExport);
  }

  let matchesFileBean: boolean;

  if (fileBean.dest !== undefined) {
    const destPattern = noSepAtStart(normalizePath(fileBean.dest));
    matchesFileBean = new RegExp(`^${globToRegex(destPattern)}$`).test(noSepAtStart(normalizePath(filePath)));
  } else {
    // Expand `**` from the project file path, then require the file's export pattern to be a suffix of
    // the resulting translation pattern (mirrors Java DownloadSourcesAction's manager-access filter).
    const translationPattern = replaceDoubleAsterisk(fileBean.source, fileBean.translation, filePath);
    matchesFileBean = normalizedExport === undefined || translationPattern.endsWith(normalizedExport);
  }

  if (!matchesFileBean) {
    return false;
  }

  const sourceName = baseName(fileBean.source);
  return sourceName === baseName(filePath) || containsPattern(sourceName) || searchPattern.includes(filePath);
}

function normalizePath(value: string): string {
  return value.replace(/[\\/]+/g, '/');
}

function noSepAtStart(value: string): string {
  return value.replace(/^[\\/]+/, '');
}

function baseName(value: string): string {
  const segments = value.split(/[\\/]+/);
  return segments[segments.length - 1] ?? value;
}

/**
 * Substitutes a project file's actual path segments into a source pattern's wildcard segments,
 * aligning from the right, mirroring Java's SourcesUtils.replaceUnaryAsterisk. A pattern segment is
 * replaced by the corresponding file segment only when the pattern segment is not `**` and the file
 * segment matches it. Used to derive `download sources` destinations from the source pattern.
 */
export function replaceUnaryAsterisk(sourcePattern: string, projectFile: string): string {
  const parts = sourcePattern.split(/[\\/]+/);
  const fileParts = projectFile.split(/[\\/]+/);

  for (let i = 1; i <= parts.length; i++) {
    const patternSegment = parts[parts.length - i];
    const fileSegment = fileParts[fileParts.length - i];

    if (
      patternSegment !== undefined &&
      patternSegment !== '**' &&
      fileSegment !== undefined &&
      new RegExp(`^${globToRegex(patternSegment)}$`).test(fileSegment)
    ) {
      parts[parts.length - i] = fileSegment;
    }
  }

  return parts.join('/');
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}
