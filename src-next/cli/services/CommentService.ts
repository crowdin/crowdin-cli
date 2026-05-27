import type { Client, StringCommentsModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/CliError.ts';

export class CommentService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async add(params: {
    text: string;
    stringId: number;
    targetLanguageId: string;
    type: StringCommentsModel.Type;
    issueType?: StringCommentsModel.IssueType;
  }): Promise<StringCommentsModel.StringComment> {
    try {
      const response = await this.client.stringCommentsApi.addStringComment(this.projectId, {
        stringId: params.stringId,
        text: params.text,
        targetLanguageId: params.targetLanguageId,
        type: params.type,
        ...(params.issueType ? { issueType: params.issueType } : {}),
      });

      return response.data;
    } catch (error) {
      throw toCliError(error, 'Comment was not added');
    }
  }

  async list(params: {
    stringId?: number;
    type?: StringCommentsModel.Type;
    issueType?: StringCommentsModel.IssueType;
    status?: StringCommentsModel.IssueStatus;
  }): Promise<StringCommentsModel.StringComment[]> {
    const response = await this.client.stringCommentsApi.withFetchAll().listStringComments(this.projectId, {
      ...(params.stringId !== undefined ? { stringId: params.stringId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.issueType ? { issueType: params.issueType } : {}),
      ...(params.status ? { issueStatus: params.status } : {}),
    });

    return response.data.map((item) => item.data);
  }

  async resolve(id: number): Promise<StringCommentsModel.StringComment> {
    try {
      const response = await this.client.stringCommentsApi.editStringComment(this.projectId, id, [
        { op: 'replace', path: '/issueStatus', value: 'resolved' },
      ]);

      return response.data;
    } catch (error) {
      throw toCliError(error, `Comment #${id} was not resolved`);
    }
  }
}
