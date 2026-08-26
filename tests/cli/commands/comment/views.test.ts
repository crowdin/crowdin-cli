import { describe, expect, test } from 'bun:test';
import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import { commentVerboseView, commentView } from '@/cli/commands/comment/views.ts';

describe('comment views', () => {
  const createComment = (
    overrides: Partial<StringCommentsModel.StringComment> = {},
  ): StringCommentsModel.StringComment =>
    ({ id: 3, text: 'Looks wrong', languageId: 'uk', ...overrides }) as StringCommentsModel.StringComment;

  test('renders id and text', () => {
    expect(commentView.text(createComment())).toBe('#3 Looks wrong');
  });

  test('collapses line breaks so one comment stays one line', () => {
    expect(commentView.text(createComment({ text: 'line one\nline two' }))).toBe('#3 line one line two');
  });

  test('prints the id alone in plain, verbose included', () => {
    expect(commentView.plain?.(createComment())).toBe('3');
    expect(commentVerboseView.plain?.(createComment({ issueType: 'general_question' }))).toBe('3');
  });

  test('adds language, issue type and lower-cased status when verbose', () => {
    const comment = createComment({
      issueType: 'general_question' as StringCommentsModel.IssueType,
      issueStatus: 'RESOLVED' as StringCommentsModel.IssueStatus,
    });

    expect(commentVerboseView.text(comment)).toBe('#3 Looks wrong uk general_question resolved');
  });

  test('leaves issue fields blank for a plain comment', () => {
    expect(commentVerboseView.text(createComment())).toBe('#3 Looks wrong uk  ');
  });
});
