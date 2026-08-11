import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

// Java CommentListAction collapses line breaks so one comment stays one line.
const singleLine = (text: string): string => text.replaceAll('\n', ' ');

// Java message.comment.list, shared by list and the add echo (CommentAddAction).
export const commentView: View<StringCommentsModel.StringComment> = {
  text: (comment) => `#${comment.id} ${singleLine(comment.text)}`,
  plain: (comment) => String(comment.id),
};

// message.comment.list.verbose adds language, issue type and lower-cased issue status.
export const commentVerboseView: View<StringCommentsModel.StringComment> = {
  text: (comment) =>
    `#${comment.id} ${singleLine(comment.text)} ${comment.languageId} ${comment.issueType ?? ''} ${(
      comment.issueStatus ?? ''
    ).toLowerCase()}`,
  plain: commentView.plain,
};
