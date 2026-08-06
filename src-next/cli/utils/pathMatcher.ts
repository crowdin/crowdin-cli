import { toPosixPath } from '@/lib/utils/path.ts';

/**
 * Matches a project file path against a **user-supplied CLI filter** (`--file`, `--filter`), not
 * against a config `source`/`ignore` pattern. Config patterns go through
 * `lib/config/projectFileMatch.ts::matchesSourcePattern`, which additionally expands the file
 * placeholders and applies the `preserve_hierarchy` tiers the way Java's
 * `formatSourcePatternForRegex` does. Using this one on a config pattern silently drops both —
 * `obsoleteEntries` did, and a `source` carrying `%original_file_name%` matched nothing.
 *
 * Mirrors the Java CLI FileHelper.isPathMatch semantics:
 * - '**' matches any number of directories
 * - '*' matches one or more characters within a path segment
 * - '?' matches a single character within a path segment
 * - square brackets are treated literally (not as character classes)
 */
export function isPathMatch(path: string, pattern: string): boolean {
  const normalizedPath = ensureLeadingSlash(toPosixPath(path));
  const normalizedPattern = ensureLeadingSlash(toPosixPath(pattern));

  return globToRegExp(normalizedPattern).test(normalizedPath);
}

function ensureLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

function globToRegExp(pattern: string): RegExp {
  const segments = pattern.split('/').filter((segment) => segment !== '');
  let source = '^/';

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;

    if (segment === '**') {
      source += isLast ? '.*' : '(?:[^/]+/)*';
      return;
    }

    source += segmentToRegExp(segment) + (isLast ? '' : '/');
  });

  return new RegExp(`${source}$`);
}

function segmentToRegExp(segment: string): string {
  return segment
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]+')
    .replace(/\?/g, '[^/]');
}
