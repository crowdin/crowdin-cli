import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import { CommentService } from '@/cli/services/CommentService.ts';

const PROJECT_ID = 123;

describe('CommentService', () => {
  afterEach(() => {
    mock.restore();
  });

  test('resolve marks the issue resolved and returns the comment', async () => {
    const apiClient = new Client({ token: 'a'.repeat(80) });
    const editStringComment = spyOn(apiClient.stringCommentsApi, 'editStringComment').mockResolvedValue({
      data: { id: 4 },
    } as never);

    const comment = await new CommentService(apiClient, PROJECT_ID).resolve(4);

    expect(comment).toEqual({ id: 4 } as never);
    expect(editStringComment).toHaveBeenCalledWith(PROJECT_ID, 4, [
      { op: 'replace', path: '/issueStatus', value: 'resolved' },
    ]);
  });
});
