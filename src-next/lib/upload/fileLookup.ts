export interface FileLookupResult {
  id: number;
  /** True for an exact path match, false for a soft (extension-insensitive) match. */
  exact: boolean;
}

/**
 * Resolves a project file path against the project's existing files, mirroring Java's
 * ProjectFilesUtils.fileLookup: an exact path wins; otherwise a path matching when ignoring the
 * final extension is a soft match; otherwise a path matching when one side keeps an extra extension
 * is used as a fallback soft match. Soft matches are reported with `exact: false` so callers can
 * rename the project file to the local source name.
 */
export function fileLookup(filePath: string, files: Map<string, number>): FileLookupResult | undefined {
  const exact = files.get(filePath);
  if (exact !== undefined) {
    return { id: exact, exact: true };
  }

  let fallback: number | undefined;

  for (const [projectPath, id] of files) {
    if (equalsIgnoreExtension(filePath, projectPath)) {
      return { id, exact: false };
    }

    if (equalsIgnoreExtraExtension(filePath, projectPath)) {
      // Keep as fallback; a perfect-extension match has higher priority.
      fallback = id;
    }
  }

  return fallback !== undefined ? { id: fallback, exact: false } : undefined;
}

function removeExtension(file: string): string {
  const index = file.lastIndexOf('.');
  return index === -1 ? file : file.slice(0, index);
}

function equalsIgnoreExtension(left: string, right: string): boolean {
  return removeExtension(left) === removeExtension(right);
}

function equalsIgnoreExtraExtension(left: string, right: string): boolean {
  return left === removeExtension(right) || removeExtension(left) === right;
}
