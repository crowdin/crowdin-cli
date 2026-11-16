import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { normalizePath } from '@/cli/utils/parsing.ts';
import { fileLookup } from '@/lib/upload/fileLookup.ts';
import { stripBranchPrefix } from '@/lib/utils/path.ts';

/**
 * One branch's project files (the root tree without a branch), addressed by branch-relative paths:
 * '/dev/src/en.json' answers to '/src/en.json'.
 */
export class ProjectFileIndex {
  readonly files: SourceFilesModel.File[];
  private readonly byPath: Map<string, SourceFilesModel.File>;
  private readonly byId: Map<number, SourceFilesModel.File>;
  private readonly idsByPath: Map<string, number>;

  constructor(files: SourceFilesModel.File[], branchName?: string) {
    this.files = files.map((file) => ({ ...file, path: stripBranchPrefix(normalizePath(file.path), branchName) }));
    this.byPath = new Map(this.files.map((file) => [file.path, file]));
    this.byId = new Map(this.files.map((file) => [file.id, file]));
    this.idsByPath = new Map(this.files.map((file) => [file.path, file.id]));
  }

  exact(path: string): SourceFilesModel.File | undefined {
    return this.byPath.get(normalizePath(path));
  }

  /**
   * Like `exact`, but falls back to a file whose path differs only by extension. `exact: false`
   * marks that fallback, so the caller can rename the project file. Paths in `localPaths` are never
   * a fallback: they have a local file of their own.
   */
  soft(path: string, localPaths?: Set<string>): { file: SourceFilesModel.File; exact: boolean } | undefined {
    const match = fileLookup(normalizePath(path), this.idsByPath, localPaths);
    const file = match && this.byId.get(match.id);

    return file && { file, exact: match.exact };
  }
}
