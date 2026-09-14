import CliError from '@/cli/errors/CliError.ts';
import { collapseSeparators, stripLeadingSlashes, stripTrailingSlashes } from './path.ts';

/*
 * `**` expands two different ways, and they are not interchangeable:
 *
 *   replaceDoubleAsterisk    - for `translation`/export patterns. Matches the file against the
 *                              group's `source` glob, so its result changes with that glob.
 *   expandDestDoubleAsterisk - for `dest`/`context`, which have no glob to match against; works off
 *                              the file's parent path and the pattern's own prefix/postfix.
 *
 * Same pattern and file through both: `/out/**\/app.json` + `src/nested/deep/app.json` gives
 * `/out/nested/deep/app.json` for a `/src/**\/*.json` source, but `out/src/nested/deep/app.json`
 * for dest. Merging them would break `translation`.
 */

/**
 * Substitutes the `**`-matched portion of a source file path into a translation pattern. The
 * `source` pattern is split on `**`; each node is trimmed from the file path so that what remains is
 * the subpath the `**` actually matched, and that subpath replaces `**` in the translation pattern.
 * Operates on POSIX paths (use toPosixPath first).
 *
 * `sourceFile` must be relative to the base path (no leading separator).
 */
export function replaceDoubleAsterisk(sourcePattern: string, translationPattern: string, sourceFile: string): string {
  if (!translationPattern || !sourceFile) {
    throw new CliError('No sources and/or translations');
  }

  if (!translationPattern.includes('**')) {
    return translationPattern;
  }

  if (!sourcePattern.includes('**')) {
    throw new CliError(
      "The mask '**' can be used in the 'translation' pattern only if it's used in the 'source' pattern",
    );
  }

  let file = sourceFile;
  const normalizedSource = sourcePattern.replace(/^\//, '');
  const sourceNodes = normalizedSource.split('**');

  for (let i = 0; i < sourceNodes.length; i++) {
    const node = sourceNodes[i] as string;

    if (file.includes(node)) {
      const start = file.indexOf(node);
      file = apacheSubstring(file, start, file.length - 1).replace(new RegExp(regexPath(node)), '');
    } else if (i === sourceNodes.length - 1) {
      if (node.includes('/')) {
        for (const sourceNode of node.split('/')) {
          const segment = `/${sourceNode}/`;

          if (file.includes(segment)) {
            file = file.replace(new RegExp(regexPath(segment)), '/');
          } else if (/[*?[\].]/.test(segment)) {
            const lastSep = file.lastIndexOf('/');
            file = lastSep > 0 ? file.substring(0, lastSep) : '';
          } else if (stripLeadingSlashes(segment).length > 0 && file.startsWith(stripLeadingSlashes(segment))) {
            file = '';
          }
        }
      } else if (file.includes('.')) {
        file = '';
      }
    }
  }

  // Replacer function, not a string, so `$&`/`$'`/`$$` in path-derived text stay literal.
  return translationPattern.replaceAll('**', () => file).replace(/\/+/g, '/');
}

/**
 * Escapes `\ ( ) + [ ]` for use in a regex, leaving `* ? .` as regex metacharacters so the remaining
 * glob chars act as regex.
 */
function regexPath(path: string): string {
  return path
    .replace(/\\/g, '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replaceAll('+', '\\+')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]');
}

/**
 * Negative indices count from the end, the range is clamped, and an inverted range yields an empty
 * string (instead of JS's arg-swapping).
 */
function apacheSubstring(str: string, start: number, end: number): string {
  let startIndex = start < 0 ? str.length + start : start;
  let endIndex = end < 0 ? str.length + end : end;

  if (endIndex > str.length) {
    endIndex = str.length;
  }

  if (startIndex > endIndex) {
    return '';
  }

  if (startIndex < 0) {
    startIndex = 0;
  }

  if (endIndex < 0) {
    endIndex = 0;
  }

  return str.substring(startIndex, endIndex);
}

/**
 * Replaces `**` in a resolved `dest`/`context` pattern with the slice of the source file's parent
 * path that the wildcard stands for.
 */
export function expandDestDoubleAsterisk(pattern: string, localFilePath: string, fileParent: string): string {
  const prefixFormat = substringBefore(pattern, '**');
  let after = substringAfter(pattern, '**');

  // Make sure the part after `**` covers the whole tail of the file path, not just a fragment of it.
  if (after.length > 1 && !localFilePath.endsWith(after) && localFilePath.includes(after)) {
    const lastIndex = localFilePath.lastIndexOf(after);
    after = collapseSeparators(`${after}/${localFilePath.slice(lastIndex + after.length)}`);
  }

  const postfix = parentDirectory(after);
  // Only trim the prefix off the parent path when the pattern's prefix actually appears in it.
  const prefix =
    prefixFormat.length > 1 && localFilePath.includes(prefixFormat)
      ? substringBefore(fileParent, stripLeadingSlashes(prefixFormat))
      : '';

  // A segment-complete prefix (`/Product.Core/**`) is trimmed only at a path-segment boundary, so
  // a folder that merely starts with the same string (`Product.Core.Implementation`) stays intact.
  // A prefix glued to `**` (`/Product.**`) still trims as a raw string, as the pattern asks.
  const prefixToken = stripTrailingSlashes(stripLeadingSlashes(prefixFormat));
  const parentTail = stripLeadingSlashes(removeStart(fileParent, prefix));
  let expanded = prefixFormat.endsWith('/')
    ? removeStartSegment(parentTail, prefixToken)
    : removeStart(parentTail, prefixToken);

  if (postfix.length > 1) {
    expanded = removeEnd(expanded, stripTrailingSlashes(postfix));
  }

  // Replacer function, not a string, so `$&`/`$'`/`$$` in path-derived text stay literal.
  return pattern.replaceAll('**', () => expanded);
}

function substringBefore(value: string, separator: string): string {
  const index = value.indexOf(separator);
  return index === -1 ? value : value.slice(0, index);
}

function substringAfter(value: string, separator: string): string {
  const index = value.indexOf(separator);
  return index === -1 ? '' : value.slice(index + separator.length);
}

function removeStart(value: string, remove: string): string {
  return remove.length > 0 && value.startsWith(remove) ? value.slice(remove.length) : value;
}

/** Like removeStart, but only when `remove` is the whole value or ends on a `/` boundary in it. */
function removeStartSegment(value: string, remove: string): string {
  if (remove.length === 0) {
    return value;
  }

  if (value === remove) {
    return '';
  }

  return value.startsWith(`${remove}/`) ? value.slice(remove.length) : value;
}

function removeEnd(value: string, remove: string): string {
  return remove.length > 0 && value.endsWith(remove) ? value.slice(0, -remove.length) : value;
}

/** The parent with a trailing separator, or '/' when there is none. */
function parentDirectory(value: string): string {
  const trimmed = stripTrailingSlashes(value);

  if (!trimmed.includes('/')) {
    return '/';
  }

  return trimmed.slice(0, trimmed.lastIndexOf('/') + 1);
}
