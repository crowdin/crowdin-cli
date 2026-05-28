import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CommentCommand from '@/cli/commands/comment/CommentCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { CommentService } from '@/cli/services/CommentService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import type { Config } from '@/lib/config.ts';

const config: Config = {
  projectId: 123,
  apiToken: 'a'.repeat(80),
  basePath: '.',
  baseUrl: 'https://api.crowdin.com',
  preserveHierarchy: true,
  files: [],
};

describe('CommentCommand', () => {
  let apiClient: Client;
  let output: Output;
  let commentService: CommentService;
  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    format: 'json',
  };

  const createCommandContext = (options: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => options,
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  beforeEach(() => {
    apiClient = new Client({ token: config.apiToken });
    output = createOutput(globalOptions);
    commentService = new CommentService(apiClient, config.projectId);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  const createCommentCommand = () => {
    return new CommentCommand(
      () => output,
      async () => commentService,
    );
  };

  describe('defaultAction', () => {
    test('calls command help', async () => {
      const cmd = createCommentCommand();
      const helpContext = createCommandContext(globalOptions);

      await cmd.defaultAction(helpContext);

      expect(helpContext.help).toHaveBeenCalledTimes(1);
    });
  });

  describe('addAction', () => {
    test('adds a comment and outputs it', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(
        { ...globalOptions, stringId: '42', language: 'uk', type: 'comment' },
        ['Hello world'],
      );

      spyOn(commentService, 'add').mockResolvedValue({
        id: 99,
        text: 'Hello world',
      } as never);

      await cmd.addAction(commandContext);

      expect(commentService.add).toHaveBeenCalledWith({
        text: 'Hello world',
        stringId: 42,
        targetLanguageId: 'uk',
        type: 'comment',
      });
      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 99, text: 'Hello world' }], null, 2));
    });

    test('adds an issue comment with issue-type', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          stringId: '10',
          language: 'fr',
          type: 'issue',
          issueType: 'general_question',
        },
        ['Something is wrong'],
      );

      spyOn(commentService, 'add').mockResolvedValue({
        id: 7,
        text: 'Something is wrong',
      } as never);

      await cmd.addAction(commandContext);

      expect(commentService.add).toHaveBeenCalledWith({
        text: 'Something is wrong',
        stringId: 10,
        targetLanguageId: 'fr',
        type: 'issue',
        issueType: 'general_question',
      });
    });

    test('defaults type to comment when not provided', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, stringId: '5', language: 'de' }, ['Nice string']);

      spyOn(commentService, 'add').mockResolvedValue({ id: 1, text: 'Nice string' } as never);

      await cmd.addAction(commandContext);

      expect(commentService.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'comment' }));
    });

    test('throws when text is missing', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, stringId: '1', language: 'en' }, []);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError('String comment text is required'));
    });

    test('throws when --string-id is missing', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, language: 'en' }, ['text']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError("The '--string-id' option is required"));
    });

    test('throws when --language is missing', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, stringId: '1' }, ['text']);

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError("The '--language' option is required"));
    });

    test('throws when issue-type is provided for comment type', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(
        {
          ...globalOptions,
          stringId: '1',
          language: 'en',
          type: 'comment',
          issueType: 'general_question',
        },
        ['text'],
      );

      expect(cmd.addAction(commandContext)).rejects.toThrow(
        new CliError('Comment should not have the --issue-type parameter. It can only be used if --type=issue'),
      );
    });

    test('propagates service errors', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, stringId: '1', language: 'en' }, ['text']);

      spyOn(commentService, 'add').mockRejectedValue(new CliError('Comment was not added'));

      expect(cmd.addAction(commandContext)).rejects.toThrow(new CliError('Comment was not added'));
    });
  });

  describe('listAction', () => {
    test('lists comments in non-verbose mode', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(globalOptions);

      spyOn(commentService, 'list').mockResolvedValue([
        { id: 1, text: 'First comment' },
        { id: 2, text: 'Second comment' },
      ] as never);

      await cmd.listAction(commandContext);

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            { id: 1, text: 'First comment' },
            { id: 2, text: 'Second comment' },
          ],
          null,
          2,
        ),
      );
    });

    test('lists comments in verbose mode with extra fields', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({ ...globalOptions, verbose: true });

      spyOn(commentService, 'list').mockResolvedValue([
        {
          id: 5,
          text: 'Issue text',
          languageId: 'fr',
          issueType: 'translation_mistake',
          issueStatus: 'unresolved',
        },
      ] as never);

      await cmd.listAction(commandContext);

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              id: 5,
              text: 'Issue text',
              languageId: 'fr',
              issueType: 'translation_mistake',
              issueStatus: 'unresolved',
            },
          ],
          null,
          2,
        ),
      );
    });

    test('normalizes line breaks in comment text', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(globalOptions);

      spyOn(commentService, 'list').mockResolvedValue([{ id: 3, text: 'line one\nline two' }] as never);

      await cmd.listAction(commandContext);

      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: 3, text: 'line one line two' }], null, 2));
    });

    test('outputs success message when no comments found', async () => {
      const textOutput = createOutput({ ...globalOptions, format: 'text' });
      const cmd = new CommentCommand(
        () => textOutput,
        async () => commentService,
      );
      const commandContext = createCommandContext({ ...globalOptions, format: 'text' });
      const successSpy = spyOn(textOutput, 'success');

      spyOn(commentService, 'list').mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(successSpy).toHaveBeenCalledWith('No comments found');
    });

    test('passes filters to service', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({
        ...globalOptions,
        stringId: '77',
        type: 'issue',
        issueType: 'source_mistake',
        status: 'unresolved',
      });
      const listSpy = spyOn(commentService, 'list').mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(listSpy).toHaveBeenCalledWith({
        stringId: 77,
        type: 'issue',
        issueType: 'source_mistake',
        status: 'unresolved',
      });
    });

    test('defaults type to issue when status is set but type is not', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({
        ...globalOptions,
        status: 'resolved',
      });
      const listSpy = spyOn(commentService, 'list').mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'issue', status: 'resolved' }));
    });

    test('does not override type when both status and type are set', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext({
        ...globalOptions,
        type: 'comment',
        status: 'resolved',
      });
      const listSpy = spyOn(commentService, 'list').mockResolvedValue([]);

      await cmd.listAction(commandContext);

      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'comment', status: 'resolved' }));
    });
  });

  describe('resolveAction', () => {
    test('resolves comment and outputs success message', async () => {
      const textOutput = createOutput({ ...globalOptions, format: 'text' });
      const cmd = new CommentCommand(
        () => textOutput,
        async () => commentService,
      );
      const commandContext = createCommandContext(globalOptions, ['42']);
      const successSpy = spyOn(textOutput, 'success');

      spyOn(commentService, 'resolve').mockResolvedValue({ id: 42 } as never);

      await cmd.resolveAction(commandContext);

      expect(commentService.resolve).toHaveBeenCalledWith(42);
      expect(successSpy).toHaveBeenCalledWith('A string issue #42 has been successfully resolved');
    });

    test('throws when id argument is missing', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(globalOptions, []);

      expect(cmd.resolveAction(commandContext)).rejects.toThrow(new CliError('Comment id can not be empty'));
    });

    test('throws when id is not a number', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(globalOptions, ['abc']);

      expect(cmd.resolveAction(commandContext)).rejects.toThrow(new CliError('Comment id must be numeric'));
    });

    test('propagates service errors', async () => {
      const cmd = createCommentCommand();
      const commandContext = createCommandContext(globalOptions, ['99']);

      spyOn(commentService, 'resolve').mockRejectedValue(new CliError('Comment #99 was not resolved'));

      expect(cmd.resolveAction(commandContext)).rejects.toThrow(new CliError('Comment #99 was not resolved'));
    });
  });
});
