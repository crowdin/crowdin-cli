import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import { toSingleLine } from '@/cli/commands/common/views.ts';
import type { View } from '@/cli/utils/output.ts';

// Java message.comment.list, shared by list and the add echo (CommentAddAction).
export const commentView: View<StringCommentsModel.StringComment> = {
  text: (comment) => `#${comment.id} ${toSingleLine(comment.text)}`,
  plain: (comment) => String(comment.id),
};

// message.comment.list.verbose adds language, issue type and lower-cased issue status.
export const commentVerboseView: View<StringCommentsModel.StringComment> = {
  text: (comment) =>
    `#${comment.id} ${toSingleLine(comment.text)} ${comment.languageId} ${comment.issueType ?? ''} ${(
      comment.issueStatus ?? ''
    ).toLowerCase()}`,
  plain: commentView.plain,
};
