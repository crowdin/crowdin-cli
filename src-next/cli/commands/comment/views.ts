import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import { toSingleLine } from '@/cli/commands/common/views.ts';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

// Java message.comment.list, shared by list and the add echo (CommentAddAction).
export const commentView: View<StringCommentsModel.StringComment> = {
  text: (comment) => `${colors.yellow(`#${comment.id}`)} ${colors.green(toSingleLine(comment.text))}`,
  plain: (comment) => String(comment.id),
};

// message.comment.list.verbose adds language, issue type and lower-cased issue status.
export const commentVerboseView: View<StringCommentsModel.StringComment> = {
  text: (comment) =>
    `${colors.yellow(`#${comment.id}`)} ${colors.green(toSingleLine(comment.text))} ${colors.red(
      comment.languageId,
    )} ${colors.blue(comment.issueType ?? '')} ${(comment.issueStatus ?? '').toLowerCase()}`,
  plain: commentView.plain,
};
