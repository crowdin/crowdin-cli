import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { decode } from '@toon-format/toon';
import { normalize } from '../helpers/normalize.ts';
import { createTestProject, deleteTestProject } from '../helpers/project.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of crowdin-backend/tests/Cli/Common/CliStringTest.php.
 *
 * Real command mapping: `StringCommand.ts` (list/add/edit/delete) and `CommentCommand.ts`
 * (add/list/resolve, confirmed at src-next/cli/commands/comment/CommentCommand.ts). Unlike the PHP
 * original's plain-text lines, `string list`/`comment list`/`comment add` all render through
 * `output.table()` -> `console.table()` (confirmed in StringCommand.ts/CommentCommand.ts), so
 * assertions below use `toContain()` on substantive cell values (identifiers/text/messages) plus
 * `toMatchSnapshot()`, never the PHP literal block - same approach as glossary.test.ts.
 *
 * Divergences from the PHP original, confirmed by reading source (not guessed):
 * - `string list --file <missing>` throws a plain `CliError` (exit 1) in `resolveSingleFileId`,
 *   not the PHP CLI's exit 102 "Project doesn't contain the file" - see StringCommand.ts.
 * - `string add --file <missing>` warns with the PHP's exact wording ("Project doesn't contain the
 *   '<file>' file") but then throws a *different* generic CliError (exit 1, not 102) once no valid
 *   file remains - see StringCommand.ts's `addAction`.
 * - `string add ""` (empty text) is rejected by the TS CLI itself before any API call ("Source
 *   string text can not be empty"), so the API's dual text/identifier `isEmpty` errors the PHP test
 *   observed never occur here - only one, CLI-side, error fires.
 * - The "file does not support online string managing/editing" wording is API-owned text; the PHP
 *   constant in crowdin-backend (`StringService::FILE_DOES_NOT_SUPPORT_ONLINE_EDITING_MESSAGE`)
 *   reads "File '%s' (id: %d) does not support online string editing", which does not literally
 *   match the PHP CLI test's hardcoded "File does not support online string managing" (likely the
 *   Java CLI's own static per-code message, not a relay of the API's text). Since the TS CLI relays
 *   `error.message` verbatim (toCliError.ts), only the substring common to both candidates ("does
 *   not support online string") is asserted - confirm the exact wording in the .snap on first run.
 */
describe('string', () => {
  let ctx: SuiteContext;
  let thirdStringId: number;
  let fourthStringId: number;
  let branchId: number;
  let branchStr2Id: number;
  let contextRequestCommentId: number;
  let stringsBasedProjectId: number;

  beforeAll(async () => {
    ctx = await setupSuite('string');
    // The string-based guards need a project of the other kind to fire against; this suite's own is
    // file-based. Addressed with `--project-id`, as branch.test.ts does for the mirror case.
    stringsBasedProjectId = (await createTestProject(ctx.client, { suite: 'string-strings-based', stringsBased: true }))
      .id;
  });

  afterAll(async () => {
    if (ctx && stringsBasedProjectId && !ctx.env.keep) {
      try {
        await deleteTestProject(ctx.client, stringsBasedProjectId);
      } catch (error) {
        console.error(`Failed to delete project #${stringsBasedProjectId}: ${error}`);
      }
    }

    await teardownSuite(ctx);
  });

  /** Finds a branch's numeric id by exact name, via the API directly (bypassing CLI output). */
  async function findBranchId(name: string): Promise<number> {
    const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectBranches(ctx.project.id, { name });
    const match = response.data.find((entry) => entry.data.name === name);

    if (!match) {
      throw new Error(`Branch '${name}' not found via the API`);
    }

    return match.data.id;
  }

  /** Finds a project file's numeric id by its exact remote path (e.g. `/text.txt`). */
  async function findFileId(projectPath: string): Promise<number> {
    const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectFiles(ctx.project.id);
    const match = response.data.find((entry) => entry.data.path === projectPath);

    if (!match) {
      throw new Error(`File '${projectPath}' not found via the API`);
    }

    return match.data.id;
  }

  /** Finds a source string's numeric id by its exact text, optionally scoped to a branch/file. */
  async function findStringId(text: string, scope: { branchId?: number; fileId?: number } = {}): Promise<number> {
    const response = await ctx.client.sourceStringsApi.withFetchAll().listProjectStrings(ctx.project.id, {
      ...(scope.branchId !== undefined ? { branchId: scope.branchId } : {}),
      ...(scope.fileId !== undefined ? { fileId: scope.fileId } : {}),
      filter: text,
    });
    const match = response.data.find((entry) => entry.data.text === text);

    if (!match) {
      throw new Error(`String '${text}' not found via the API`);
    }

    return match.data.id;
  }

  /** Finds a string comment's numeric id by its exact text, via the API directly. */
  async function findCommentId(text: string): Promise<number> {
    const response = await ctx.client.stringCommentsApi.withFetchAll().listStringComments(ctx.project.id);
    const match = response.data.find((entry) => entry.data.text === text);

    if (!match) {
      throw new Error(`Comment '${text}' not found via the API`);
    }

    return match.data.id;
  }

  /** Resolves label ids to their titles, via the API directly. */
  async function labelTitles(labelIds: number[]): Promise<string[]> {
    if (labelIds.length === 0) {
      return [];
    }

    const response = await ctx.client.labelsApi.withFetchAll().listLabels(ctx.project.id);
    const titleById = new Map(response.data.map((entry) => [entry.data.id, entry.data.title]));

    return labelIds.map((id) => titleById.get(id) ?? String(id));
  }

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(result.stdout).toContain("File 'text.txt'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists all source strings', async () => {
    const result = await ctx.runner.run(['string', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(result.stdout).toContain('first string source` with tag');
    expect(result.stdout).toContain("first string source' with quotes");
    expect(result.stdout).toContain('First text string.');
    expect(result.stdout).toContain('Second text string.');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings authenticating via -T/-i against a config without an api_token', async () => {
    await switchConfig(ctx, 'without-token');

    const result = await ctx.runner.run([
      'string',
      'list',
      '-T',
      ctx.env.token as string,
      '-i',
      String(ctx.project.id),
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings filtered by file', async () => {
    // Restores the full config (token + project id + both file entries), mirroring the PHP
    // original's `self::prepareConfig()` reset at the start of the equivalent method.
    await switchConfig(ctx, 'default');

    const result = await ctx.runner.run(['string', 'list', '--file', 'android.xml']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(result.stdout).toContain('first string source` with tag');
    expect(result.stdout).not.toContain('First text string.');
    expect(result.stdout).not.toContain('Second text string.');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings filtered by identifier/text/context', async () => {
    const result = await ctx.runner.run(['string', 'list', '--filter', 'str1']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('first string');
    expect(result.stdout).not.toContain('second string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings verbosely, including file and context', async () => {
    const result = await ctx.runner.run(['string', 'list', '-v']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('android.xml');
    expect(result.stdout).toContain('text.txt');
    expect(result.stdout).toContain('str1');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a new source string', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'third string',
      '--identifier',
      'str3',
      '--file',
      'android.xml',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('str3');
    expect(result.stdout).toContain('third string');
    expect(normalize(result.stdout)).toMatchSnapshot();

    thirdStringId = await findStringId('third string');
    const added = await ctx.client.sourceStringsApi.getString(ctx.project.id, thirdStringId);
    // The PHP original assumed Crowdin md5-hashes an Android-XML string's identifier server-side.
    // A live read says otherwise: `--identifier str3` is stored verbatim - which is exactly the
    // re-verification the helper's own comment asked for.
    expect(added.data.identifier).toBe('str3');
    expect(added.data.maxLength).toBe(0);
    expect(added.data.context).toBe('str3');
    expect(added.data.isHidden).toBe(false);
  });

  test('adds a new source string with all parameters', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'fourth string',
      '--identifier',
      'str4',
      '--max-length',
      '10',
      '--context',
      'simple context',
      '--file',
      'android.xml',
      '--label',
      'android_file',
      '--hidden',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('str4');
    expect(result.stdout).toContain('fourth string');
    expect(normalize(result.stdout)).toMatchSnapshot();

    fourthStringId = await findStringId('fourth string');
    const added = await ctx.client.sourceStringsApi.getString(ctx.project.id, fourthStringId);
    expect(added.data.identifier).toBe('str4');
    expect(added.data.maxLength).toBe(10);
    expect(added.data.context).toBe('str4\nsimple context');
    expect(added.data.isHidden).toBe(true);
    expect(await labelTitles(added.data.labelIds)).toEqual(['android_file']);
  });

  test('edits a source string', async () => {
    const result = await ctx.runner.run([
      'string',
      'edit',
      String(thirdStringId),
      '--text',
      'third string edited',
      '--label',
      'android_file',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('was updated successfully');
    expect(result.stdout).toContain('third string edited');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const edited = await ctx.client.sourceStringsApi.getString(ctx.project.id, thirdStringId);
    expect(edited.data.identifier).toBe('str3');
    expect(edited.data.maxLength).toBe(0);
    expect(edited.data.context).toBe('str3');
    expect(edited.data.isHidden).toBe(false);
    expect(await labelTitles(edited.data.labelIds)).toEqual(['android_file']);
  });

  test('edits a source string with all parameters', async () => {
    const result = await ctx.runner.run([
      'string',
      'edit',
      String(fourthStringId),
      '--text',
      'fourth string edited',
      '--max-length',
      '0',
      '--context',
      'simple context edited',
      '--no-hidden',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('was updated successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const edited = await ctx.client.sourceStringsApi.getString(ctx.project.id, fourthStringId);
    expect(edited.data.identifier).toBe('str4');
    expect(edited.data.maxLength).toBe(0);
    expect(edited.data.context).toBe('simple context edited');
    expect(edited.data.isHidden).toBe(false);
  });

  test('deletes a source string', async () => {
    const result = await ctx.runner.run(['string', 'delete', String(thirdStringId)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('was deleted successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(result.stdout).toContain("File 'text.txt'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    branchId = await findBranchId('test-branch');
  });

  test('adds a source string to a branch-scoped file', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'third string',
      '--identifier',
      'str3',
      '--branch',
      'test-branch',
      '--file',
      '/android.xml',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('str3');
    expect(result.stdout).toContain('third string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('deletes a source string from a branch-scoped file', async () => {
    const id = await findStringId('first string', { branchId });
    const result = await ctx.runner.run(['string', 'delete', String(id)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('was deleted successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing file when listing by file', async () => {
    const result = await ctx.runner.run(['string', 'list', '--file', 'not-exists-file.xml']);

    // Real TS behavior: `resolveSingleFileId` throws a plain CliError (exit 1), unlike the PHP
    // CLI's exit 102 - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("File 'not-exists-file.xml' not found");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('warns then fails adding a string to a missing file', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'not-exists-file.xml']);

    // Real TS behavior: the missing-file warning matches the PHP wording verbatim, but the final
    // thrown error (exit 1, not the PHP CLI's exit 102) is TS-specific - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'not-exists-file.xml' file");
    expect(result.stderr).toContain('No valid file specified for the string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('fails adding a string to an unsupported file type', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'text.txt']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires non-empty text when adding a string', async () => {
    const result = await ctx.runner.run(['string', 'add', '', '--file', 'android.xml']);

    // The TS CLI rejects an empty text argument itself, before any API call, so the API's dual
    // text/identifier `isEmpty` errors the PHP original observed never occur - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Source string text can not be empty');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires an identifier when adding a string without one', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'android.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Value is required and can't be empty");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing string when editing a nonexistent id', async () => {
    const result = await ctx.runner.run(['string', 'edit', '999999', '--text', 'simple string']);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain('String Not Found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('fails editing a string in an unsupported file type', async () => {
    const textFileId = await findFileId('/text.txt');
    const id = await findStringId('First text string.', { fileId: textFileId });
    const result = await ctx.runner.run(['string', 'edit', String(id), '--text', 'simple string']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing string when deleting a nonexistent id', async () => {
    const result = await ctx.runner.run(['string', 'delete', '999999']);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain('String Not Found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test.each(['json', 'toon'] as const)('reports that failure as a %s record carrying the exit code', async (format) => {
    const result = await ctx.runner.run(['string', 'delete', '999999', '--output', format]);
    const record = (format === 'json' ? JSON.parse : decode)(result.stderr) as {
      level: string;
      message: string;
      code: number;
    };

    expect(result.exitCode).toBe(102);
    expect(record.level).toBe('error');
    expect(record.message).toContain('String Not Found');
    expect(record.code).toBe(102);
    expect(result.stdout.trim()).toBe('');
  });

  test('fails deleting a string in an unsupported file type', async () => {
    const textFileId = await findFileId('/text.txt');
    const id = await findStringId('First text string.', { fileId: textFileId });
    const result = await ctx.runner.run(['string', 'delete', String(id)]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings by a CroQL expression', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', 'type is plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('fourth string edited');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings by a CroQL text match, spanning both branches', async () => {
    const result = await ctx.runner.run([
      'string',
      'list',
      '--croql',
      'text = "<span>first string source` with tag</span>"',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    // One copy from the initial upload, one from the branch upload - see "uploads sources to a new
    // branch" above. Counting substring occurrences (not table rows) sidesteps console.table's
    // formatting, mirroring file-groups.test.ts's duplicate-count assertion.
    const matches = result.stdout.split('first string source` with tag</span>').length - 1;
    expect(matches).toBe(2);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings by a CroQL text match with a quote, spanning both branches', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', `text = "first string source' with quotes"`]);

    expect(result).toMatchObject({ exitCode: 0 });
    const matches = result.stdout.split("first string source' with quotes").length - 1;
    expect(matches).toBe(2);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an invalid CroQL expression', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', '11111111111']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The inferred type is not equal to 'bool'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a comment to a source string', async () => {
    const id = await findStringId("first string source' with quotes", { branchId });
    const result = await ctx.runner.run(['comment', 'add', 'Added comment', '--string-id', String(id), '-l', 'uk']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added comment');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments', async () => {
    const result = await ctx.runner.run(['comment', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added comment');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds an issue to a source string', async () => {
    branchStr2Id = await findStringId('second string', { branchId });
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Added comment string id 10',
      '--string-id',
      String(branchStr2Id),
      '-l',
      'uk',
      '--type',
      'issue',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added comment string id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds an issue with a context-request type', async () => {
    const result = await ctx.runner.run([
      'comment',
      'add',
      'Added issue string context_request id 10',
      '--string-id',
      String(branchStr2Id),
      '-l',
      'uk',
      '--type',
      'issue',
      '--issue-type',
      'context_request',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();

    contextRequestCommentId = await findCommentId('Added issue string context_request id 10');
  });

  test('lists comments filtered by a specific string id', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--string-id', String(branchStr2Id)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added comment string id 10');
    expect(result.stdout).toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('resolves a string issue', async () => {
    const result = await ctx.runner.run(['comment', 'resolve', String(contextRequestCommentId)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('has been successfully resolved');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments filtered by unresolved status', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--status', 'unresolved']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Added comment string id 10');
    // The context-request issue was just resolved above, so it must not show up here anymore.
    expect(result.stdout).not.toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Everything below runs after the listing snapshots above, so the strings these tests add cannot
  // shift them. The option guards throw before any request, so they cost nothing.

  test('rejects --file and --directory together', async () => {
    const result = await ctx.runner.run(['string', 'list', '--file', 'android.xml', '--directory', 'sources']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--file' and '--directory' options can't be used together");
  });

  test('rejects --scope without --filter', async () => {
    const result = await ctx.runner.run(['string', 'list', '--scope', 'identifier']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--scope' option can only be used together with '--filter'");
  });

  test('rejects --croql alongside another filter', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', 'text = "x"', '--filter', 'str']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--croql' option can't be used together with --filter");
  });

  test('names every filter that conflicts with --croql, not just the first', async () => {
    const result = await ctx.runner.run([
      'string',
      'list',
      '--croql',
      'text = "x"',
      '--filter',
      'str',
      '--file',
      'android.xml',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--croql' option can't be used together with --filter, --file");
  });

  test('rejects a negative --max-length when adding', async () => {
    const result = await ctx.runner.run(['string', 'add', 'negative', '--file', 'android.xml', '--max-length=-1']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--max-length' cannot be lower than 0");
  });

  test('rejects a negative --max-length when editing', async () => {
    const result = await ctx.runner.run(['string', 'edit', String(thirdStringId), '--max-length=-1']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--max-length' cannot be lower than 0");
  });

  test('requires at least one parameter on edit', async () => {
    const result = await ctx.runner.run(['string', 'edit', String(thirdStringId)]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Specify some parameters to edit the string');
  });

  test('requires --file when adding to a file-based project', async () => {
    const result = await ctx.runner.run(['string', 'add', 'no file given']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--file' value can not be empty");
  });

  test('reports a directory the project does not contain', async () => {
    const result = await ctx.runner.run(['string', 'list', '--directory', 'no-such-directory']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('no-such-directory');
  });

  test('stores a plural text built from the plural-form options', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'other form',
      '--identifier',
      'plural_str',
      '--file',
      'android.xml',
      '--one',
      'one form',
      '--output',
      'json',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });

    // The id comes from the command's own echo: findStringId matches on `data.text`, which for a
    // plural string is an object rather than the string it was created from. A file-based add
    // prints a list (one entry per resolved `--file`), not a single item.
    const [echoed] = JSON.parse(result.stdout) as { id: number }[];
    const added = await ctx.client.sourceStringsApi.getString(ctx.project.id, echoed?.id as number);

    // `other` comes from the positional argument, `one` from the flag. Only the forms the source
    // language actually has may be sent - English has [one, other], and the API rejects the rest
    // with "Unknown [few] in this locale", so this is not the place to pass all five.
    expect(added.data.text).toEqual({ other: 'other form', one: 'one form' });
  });

  test('narrows the json listing to the view keys, and widens it with --verbose', async () => {
    const plain = await ctx.runner.run(['string', 'list', '--output', 'json']);
    const verbose = await ctx.runner.run(['string', 'list', '--output', 'json', '-v']);

    expect(plain).toMatchObject({ exitCode: 0 });
    expect(verbose).toMatchObject({ exitCode: 0 });

    const plainKeys = (JSON.parse(plain.stdout) as object[]).map((entry) => Object.keys(entry).join());
    const verboseKeys = (JSON.parse(verbose.stdout) as object[]).map((entry) => Object.keys(entry).join());

    expect(new Set(plainKeys)).toEqual(new Set(['id,identifier,text']));
    expect(new Set(verboseKeys)).toEqual(new Set(['id,identifier,text,fileId,labelIds,context']));
  });

  test('carries the same listing in the toon output', async () => {
    const json = await ctx.runner.run(['string', 'list', '--output', 'json']);
    const toon = await ctx.runner.run(['string', 'list', '--output', 'toon']);

    expect(toon).toMatchObject({ exitCode: 0 });
    expect(decode(toon.stdout)).toEqual(JSON.parse(json.stdout));
  });

  test('lists bare string ids with --output plain', async () => {
    const result = await ctx.runner.run(['string', 'list', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });

    const lines = result.stdout.split('\n').filter((line) => line.length > 0);

    const json = await ctx.runner.run(['string', 'list', '--output', 'json']);
    const ids = (JSON.parse(json.stdout) as { id: number }[]).map((entry) => String(entry.id));

    expect(lines.every((line) => /^\d+$/.test(line))).toBe(true);
    expect(lines.sort()).toEqual(ids.sort());
  });

  test('rejects --file when listing a string-based project', async () => {
    const result = await ctx.runner.run([
      'string',
      'list',
      '--file',
      'android.xml',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "The '--file' and '--directory' options are not supported for string-based projects",
    );
  });

  test('rejects --file when adding to a string-based project', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'strings based',
      '--file',
      'android.xml',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--file' option is not supported for string-based projects");
  });

  test('requires --branch when adding to a string-based project', async () => {
    const result = await ctx.runner.run([
      'string',
      'add',
      'strings based',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--branch' option is required for string-based projects");
  });
});
