import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';

// Java strips leading slashes from displayed paths (FileListAction).
const displayPath = (file: SourceFilesModel.File): string => stripLeadingSlashes(file.path);

function hasRevisionInfo(file: SourceFilesModel.File): boolean {
  return file.parserVersion !== undefined && file.revisionId !== undefined;
}

// Java message.file.list.
export const fileView: View<SourceFilesModel.File> = {
  text: (file) => `#${file.id} ${displayPath(file)}`,
  plain: (file) => `${file.id} ${displayPath(file)}`,
};

// Verbose splits on whether the entry carries parser/revision data, as Java splits on
// FileInfo vs File: list_verbose_full when it does, list_verbose when it doesn't.
export const fileVerboseView: View<SourceFilesModel.File> = {
  text: (file) =>
    hasRevisionInfo(file)
      ? `#${file.id} ${displayPath(file)} ${file.type} parser:${file.parserVersion} revision:${file.revisionId}`
      : `#${file.id} ${displayPath(file)} ${file.type}`,
  plain: (file) =>
    hasRevisionInfo(file)
      ? `${file.id} ${displayPath(file)} ${file.type} ${file.parserVersion} ${file.revisionId}`
      : `${file.id} ${displayPath(file)} ${file.type}`,
};
