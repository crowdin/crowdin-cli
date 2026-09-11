import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import { toSingleLine } from '@/cli/commands/common/views.ts';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

// Shared by list and the add echo.
export const commentView: View<StringCommentsModel.StringComment> = {
  text: (comment) => `${colors.yellow(`#${comment.id}`)} ${colors.green(toSingleLine(comment.text))}`,
  plain: (comment) => String(comment.id),
  keys: ['id', 'text'],
};

// The verbose line adds language, issue type and lower-cased issue status.
export const commentVerboseView: View<StringCommentsModel.StringComment> = {
  text: (comment) =>
    `${colors.yellow(`#${comment.id}`)} ${colors.green(toSingleLine(comment.text))} ${colors.red(
      comment.languageId,
    )} ${colors.blue(comment.issueType ?? '')} ${(comment.issueStatus ?? '').toLowerCase()}`,
  plain: commentView.plain,
  keys: ['id', 'text', 'languageId', 'issueType', 'issueStatus'],
};
