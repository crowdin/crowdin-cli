import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';

// Java strips leading slashes from displayed paths (FileListAction).
const displayPath = (file: SourceFilesModel.File): string => stripLeadingSlashes(file.path);

function hasRevisionInfo(file: SourceFilesModel.File): boolean {
  return file.parserVersion !== undefined && file.revisionId !== undefined;
}

// Java message.file.list.
export const fileView: View<SourceFilesModel.File> = {
  text: (file) => `${colors.yellow(`#${file.id}`)} ${colors.green(displayPath(file))}`,
  plain: (file) => `${file.id} ${displayPath(file)}`,
  keys: ['id', 'path'],
};

// Verbose splits on whether the entry carries parser/revision data, as Java splits on
// FileInfo vs File: list_verbose_full when it does, list_verbose when it doesn't.
export const fileVerboseView: View<SourceFilesModel.File> = {
  text: (file) => {
    const head = `${colors.yellow(`#${file.id}`)} ${colors.green(displayPath(file))} ${file.type}`;
    return hasRevisionInfo(file) ? `${head} parser:${file.parserVersion} revision:${file.revisionId}` : head;
  },
  plain: (file) =>
    hasRevisionInfo(file)
      ? `${file.id} ${displayPath(file)} ${file.type} ${file.parserVersion} ${file.revisionId}`
      : `${file.id} ${displayPath(file)} ${file.type}`,
  keys: ['id', 'path', 'type', 'parserVersion', 'revisionId'],
};
