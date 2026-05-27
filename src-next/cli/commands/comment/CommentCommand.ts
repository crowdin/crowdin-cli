import type { StringCommentsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetCommentService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import issueType from './options/issueType.ts';
import language from './options/language.ts';
import status from './options/status.ts';
import stringId from './options/stringId.ts';
import type_ from './options/type.ts';

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
          options: [stringId, language, type_, issueType],
          action: this.addAction,
        },
        {
          name: 'list',
          description: 'List comments',
          options: [stringId, type_, issueType, status],
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
    const options = command.optsWithGlobals() as AddOptions;
    const [text] = command.args;
    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);

    if (!text) {
      throw new CliError('String comment text is required');
    }

    if (!options.stringId) {
      throw new CliError("The '--string-id' option is required");
    }

    if (!options.language) {
      throw new CliError("The '--language' option is required");
    }

    const type = (options.type ?? 'comment') as StringCommentsModel.Type;
    const issueTypeValue = options.issueType as StringCommentsModel.IssueType | undefined;

    if (type === 'comment' && issueTypeValue) {
      throw new CliError('Comment should not have the --issue-type parameter. It can only be used if --type=issue');
    }

    const comment = await commentService.add({
      text,
      stringId: Number(options.stringId),
      targetLanguageId: options.language,
      type,
      ...(issueTypeValue ? { issueType: issueTypeValue } : {}),
    });

    output.table([{ id: comment.id, text: comment.text }]);
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ListOptions;
    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);

    let type = options.type as StringCommentsModel.Type | undefined;
    const status = options.status as StringCommentsModel.IssueStatus | undefined;

    if (status && !type) {
      type = 'issue';
    }

    const comments = await commentService.list({
      ...(options.stringId !== undefined ? { stringId: Number(options.stringId) } : {}),
      ...(type ? { type } : {}),
      ...(options.issueType ? { issueType: options.issueType as StringCommentsModel.IssueType } : {}),
      ...(status ? { status } : {}),
    });

    if (comments.length === 0) {
      output.success('No comments found');

      return;
    }

    if (options.verbose) {
      output.table(
        comments.map((c) => ({
          id: c.id,
          text: c.text.replaceAll('\n', ' '),
          languageId: c.languageId,
          issueType: c.issueType ?? '',
          issueStatus: (c.issueStatus ?? '').toLowerCase(),
        })),
      );
    } else {
      output.table(
        comments.map((c) => ({
          id: c.id,
          text: c.text.replaceAll('\n', ' '),
        })),
      );
    }
  };

  resolveAction = async (command: Command) => {
    const [idArg] = command.args;
    const output = this.getOutput(command);
    const commentService = await this.getCommentService(command);

    if (!idArg) {
      throw new CliError('Numeric ID of the string comment is required');
    }

    const id = Number(idArg);

    if (Number.isNaN(id)) {
      throw new CliError('Invalid comment ID: must be a number');
    }

    const comment = await commentService.resolve(id);

    output.success(`A string issue #${comment.id} has been successfully resolved`);
  };
}
