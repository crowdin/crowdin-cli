import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';

const displayPath = (file: SourceFilesModel.File): string => stripLeadingSlashes(file.path);

function hasRevisionInfo(file: SourceFilesModel.File): boolean {
  return file.parserVersion !== undefined && file.revisionId !== undefined;
}

export const fileView: View<SourceFilesModel.File> = {
  text: (file) => `${colors.yellow(`#${file.id}`)} ${colors.green(displayPath(file))}`,
  plain: (file) => `${file.id} ${displayPath(file)}`,
  keys: ['id', 'path'],
};

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
