import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `comment add` / `list` / `resolve` (`cli/commands/comment/CommentCommand.ts`).
 *
 * `string.test.ts` already walks the happy path as part of its own scenario; this suite owns the
 * command's own surface - CLI-side validation, the `--type`/`--issue-type`/`--status` filter
 * matrix, the output formats, and the failure exit codes.
 */
describe('comment', () => {
  let ctx: SuiteContext;
  let welcomeStringId: number;
  let farewellStringId: number;
  let translationMistakeId: number;

  beforeAll(async () => {
    ctx = await setupSuite('comment');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  async function findStringId(text: string): Promise<number> {
    const response = await ctx.client.sourceStringsApi
      .withFetchAll()
      .listProjectStrings(ctx.project.id, { filter: text });
    const match = response.data.find((entry) => entry.data.text === text);

    if (!match) {
      throw new Error(`String '${text}' not found via the API`);
    }

    return match.data.id;
  }

  async function findCommentId(text: string): Promise<number> {
    const response = await ctx.client.stringCommentsApi.withFetchAll().listStringComments(ctx.project.id);
    const match = response.data.find((entry) => entry.data.text === text);

    if (!match) {
      throw new Error(`Comment '${text}' not found via the API`);
    }

    return match.data.id;
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['comment']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage string comments and issues');
    expect(result.stdout).toContain('add');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('resolve');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['comment', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports no comments before any exist', async () => {
    const result = await ctx.runner.run(['comment', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No comments found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    welcomeStringId = await findStringId('Welcome aboard');
    farewellStringId = await findStringId('See you next time');
  });

  // `text` is declared as a required positional (builder.ts wraps every argument in `<>`), so
  // commander rejects it as a usage error before CommentCommand's own emptiness check runs.
  test('requires the comment text', async () => {
    const result = await ctx.runner.run(['comment', 'add', '--string-id', String(welcomeStringId)]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'text'");
  });

  test('requires --string-id', async () => {
    const result = await ctx.runner.run(['comment', 'add', 'Orphan comment']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--string-id' option is required");
  });

  test('requires --language when adding an issue', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Issue without a language',
      '--string-id',
      String(welcomeStringId),
      '--type',
      'issue',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--language' option is required when --type=issue");
  });

  test('rejects --issue-type on a plain comment', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Comment with an issue type',
      '--string-id',
      String(welcomeStringId),
      '-l',
      'uk',
      '--issue-type',
      'source_mistake',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Comment should not have the --issue-type parameter');
  });

  test('rejects an unsupported --type value', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Bad type',
      '--string-id',
      String(welcomeStringId),
      '-l',
      'uk',
      '--type',
      'suggestion',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('suggestion');
  });

  test('rejects an unsupported --issue-type value', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Bad issue type',
      '--string-id',
      String(welcomeStringId),
      '-l',
      'uk',
      '--type',
      'issue',
      '--issue-type',
      'typo',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('typo');
  });

  test('fails to add a comment to a string that does not exist', async () => {
    const result = await ctx.runner.run(['comment', 'add', 'Ghost comment', '--string-id', '1', '-l', 'uk']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Comment was not added');
  });

  test('adds a plain comment', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Plain comment on welcome',
      '--string-id',
      String(welcomeStringId),
      '-l',
      'uk',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Plain comment on welcome');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds an issue with a translation_mistake type', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Wrong translation of farewell',
      '--string-id',
      String(farewellStringId),
      '-l',
      'uk',
      '--type',
      'issue',
      '--issue-type',
      'translation_mistake',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(normalize(result.stdout)).toMatchSnapshot();

    translationMistakeId = await findCommentId('Wrong translation of farewell');
  });

  test('adds an issue with a source_mistake type', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Typo in the source of farewell',
      '--string-id',
      String(farewellStringId),
      '-l',
      'it',
      '--type',
      'issue',
      '--issue-type',
      'source_mistake',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Typo in the source of farewell');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists every comment', async () => {
    const result = await ctx.runner.run(['comment', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Plain comment on welcome');
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(result.stdout).toContain('Typo in the source of farewell');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments filtered by string id', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--string-id', String(welcomeStringId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Plain comment on welcome');
    expect(result.stdout).not.toContain('Wrong translation of farewell');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists only issues when filtered by type', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--type', 'issue']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(result.stdout).toContain('Typo in the source of farewell');
    expect(result.stdout).not.toContain('Plain comment on welcome');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // --issue-type alone must still reach the API as an issue query: the CLI infers `type=issue`,
  // without which the API rejects the request with "Any of [type] must be set".
  test('infers the issue type when only --issue-type is given', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--issue-type', 'translation_mistake']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(result.stdout).not.toContain('Typo in the source of farewell');
    expect(result.stdout).not.toContain('Plain comment on welcome');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Same inference, driven by --status instead.
  test('infers the issue type when only --status is given', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--status', 'unresolved']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(result.stdout).toContain('Typo in the source of farewell');
    expect(result.stdout).not.toContain('Plain comment on welcome');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an unsupported --status value', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--status', 'closed']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('closed');
  });

  test('lists comments with the verbose view', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--type', 'issue', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('translation_mistake');
    expect(result.stdout).toContain('unresolved');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments as structured data', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const comments = JSON.parse(result.stdout) as { id: number; text: string }[];

    expect(comments.map((comment) => comment.text).sort()).toEqual([
      'Plain comment on welcome',
      'Typo in the source of farewell',
      'Wrong translation of farewell',
    ]);
  });

  test('lists comment ids only in the plain output', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    const ids = result.stdout.trim().split('\n').filter(Boolean);

    expect(ids).toHaveLength(3);
    expect(ids).toContain(String(translationMistakeId));
  });

  test('rejects a non-numeric comment id on resolve', async () => {
    const result = await ctx.runner.run(['comment', 'resolve', 'abc']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Comment id must be numeric');
  });

  test('fails to resolve a comment that does not exist', async () => {
    const result = await ctx.runner.run(['comment', 'resolve', '1']);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain('Comment #1 was not resolved');
  });

  test('resolves a string issue', async () => {
    const result = await ctx.runner.run(['comment', 'resolve', String(translationMistakeId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('has been successfully resolved');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists the resolved issue under the resolved status', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--status', 'resolved']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Wrong translation of farewell');
    expect(result.stdout).not.toContain('Typo in the source of farewell');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
