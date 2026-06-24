import CliError from '@/cli/errors/CliError.ts';

/**
 * Substitutes the `**`-matched portion of a source file path into a translation pattern, mirroring
 * Java's TranslationsUtils.replaceDoubleAsterisk. The `source` pattern is split on `**`; each node is
 * trimmed from the file path so that what remains is the subpath the `**` actually matched, and that
 * subpath replaces `**` in the translation pattern. Operates on POSIX paths (use toPosixPath first).
 *
 * `sourceFile` must be relative to the base path (no leading separator), matching Java's
 * `StringUtils.removeStart(projectFile, basePath)`.
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
          } else if (noSepAtStart(segment).length > 0 && file.startsWith(noSepAtStart(segment))) {
            file = '';
          }
        }
      } else if (file.includes('.')) {
        file = '';
      }
    }
  }

  return translationPattern.replaceAll('**', file).replace(/\/+/g, '/');
}

/**
 * Escapes the characters Java's Utils.regexPath escapes (`\ ( ) + [ ]`) for use in a regex, leaving
 * `* ? .` as regex metacharacters — matching Java's behavior where remaining glob chars act as regex.
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

function noSepAtStart(path: string): string {
  return path.replace(/^[\\/]+/, '');
}

/**
 * Mirrors Apache Commons StringUtils.substring(str, start, end): negative indices count from the end,
 * the range is clamped, and an inverted range yields an empty string (instead of JS's arg-swapping).
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
