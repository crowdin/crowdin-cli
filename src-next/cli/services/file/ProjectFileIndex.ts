import path from 'node:path';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { normalizePath } from '@/cli/utils/parsing.ts';
import { stripBranchPrefix } from '@/lib/utils/path.ts';

/**
 * One branch's project files (the root tree without a branch), addressed by branch-relative paths:
 * '/dev/src/en.json' answers to '/src/en.json'.
 */
export class ProjectFileIndex {
  readonly files: SourceFilesModel.File[];
  private readonly byPath: Map<string, SourceFilesModel.File>;

  constructor(files: SourceFilesModel.File[], branchName?: string) {
    this.files = files.map((file) => ({ ...file, path: stripBranchPrefix(normalizePath(file.path), branchName) }));
    this.byPath = new Map(this.files.map((file) => [file.path, file]));
  }

  exact(path: string): SourceFilesModel.File | undefined {
    return this.byPath.get(normalizePath(path));
  }

  /**
   * Like `exact`, but falls back to a file whose path differs only by its last extension
   * ('app.yml' for 'app.yaml'), or else by one extra extension ('app' for 'app.json'). `exact: false`
   * marks a fallback, so the caller can rename the project file. Paths in `localPaths` are never a
   * fallback: they have a local file of their own.
   */
  soft(path: string, localPaths?: Set<string>): { file: SourceFilesModel.File; exact: boolean } | undefined {
    const wanted = normalizePath(path);
    const exactMatch = this.byPath.get(wanted);

    if (exactMatch) {
      return { file: exactMatch, exact: true };
    }

    let extraExtensionMatch: SourceFilesModel.File | undefined;

    for (const file of this.files) {
      if (localPaths?.has(file.path)) {
        continue;
      }

      if (this.removeExtension(wanted) === this.removeExtension(file.path)) {
        return { file, exact: false };
      }

      if (wanted === this.removeExtension(file.path) || this.removeExtension(wanted) === file.path) {
        extraExtensionMatch = file;
      }
    }

    return extraExtensionMatch && { file: extraExtensionMatch, exact: false };
  }

  private removeExtension(filePath: string): string {
    return filePath.slice(0, filePath.length - path.posix.extname(filePath).length);
  }
}
