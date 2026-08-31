import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetCommentService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { parseNumericId } from '@/cli/utils/parsing.ts';
import { add, list } from './options.ts';
import { commentVerboseView, commentView } from './views.ts';

interface AddOptions extends GlobalOptions {
  stringId?: string;
  language?: string;
  type?: string;
  issueType?: string;
}

interface ListOptions extends GlobalOptions {
  stringId?: string;
  type?: string;
  issueType?: string;
  status?: string;
}

export default class CommentCommand {
  constructor(
    private getOutput: GetOutput,
    private getCommentService: GetCommentService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'comment',
      description: 'Manage string comments and issues',
      subcommands: [
        {
          name: 'add',
          description: 'Add a comment to the given string',
          arguments: [
            {
              name: 'text',
              description: 'String comment text',
            },
          ],
          options: [add.stringId, add.language, add.type, add.issueType, projectConfigGroup],
          action: this.addAction,
        },
        {
          name: 'list',
          description: 'List comments',
          options: [list.stringId, list.type, list.issueType, list.status, projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'resolve',
          description: 'Resolve reported issues with source strings or translations',
          arguments: [
            {
              name: 'id',
              description: 'Numeric ID of the string comment',
            },
          ],
          options: [projectConfigGroup],
          action: this.resolveAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  addAction = async (command: Command) => {
    const [text] = command.args;
    const options = command.optsWithGlobals() as AddOptions;

    if (!text) {
      throw new CliError('String comment text is required');
    }

    if (!options.stringId) {
      throw new CliError("The '--string-id' option is required");
    }

    const type = (options.type ?? 'comment') as StringCommentsModel.Type;
    const issueTypeValue = options.issueType as StringCommentsModel.IssueType | undefined;

    if (type === 'issue' && !options.language) {
      throw new CliError("The '--language' option is required when --type=issue");
    }

    if (type === 'comment' && issueTypeValue) {
      throw new CliError('Comment should not have the --issue-type parameter. It can only be used if --type=issue');
    }

    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);
    const comment = await commentService.add({
      text,
      stringId: Number(options.stringId),
      ...(options.language ? { targetLanguageId: options.language } : {}),
      type,
      ...(issueTypeValue ? { issueType: issueTypeValue } : {}),
    });

    output.item(comment, commentView);
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ListOptions;
    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);
    const status = options.status as StringCommentsModel.IssueStatus | undefined;
    let type = options.type as StringCommentsModel.Type | undefined;

    // Both filters only exist on issues, and the API rejects either one on its own with "Any of
    // [type] must be set". Java infers the type for --status (CommentListAction); --issue-type
    // needs it for the same reason.
    if ((status || options.issueType) && !type) {
      type = 'issue';
    }

    const comments = await commentService.list({
      ...(options.stringId !== undefined ? { stringId: Number(options.stringId) } : {}),
      ...(type ? { type } : {}),
      ...(options.issueType ? { issueType: options.issueType as StringCommentsModel.IssueType } : {}),
      ...(status ? { status } : {}),
    });

    output.list(comments, options.verbose ? commentVerboseView : commentView, { empty: 'No comments found' });
  };

  resolveAction = async (command: Command) => {
    const [idArg] = command.args;
    const id = parseNumericId(idArg, 'Comment');
    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);
    const comment = await commentService.resolve(id);

    output.success(`A string issue #${comment.id} has been successfully resolved`);
    // Text keeps Java's sentence; the machine formats get the resolved comment itself, as the add
    // echo above already does.
    output.item(comment, commentView, { mark: false });
  };
}
