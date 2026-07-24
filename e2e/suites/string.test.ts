import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

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

  beforeAll(async () => {
    ctx = await setupSuite('string');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  /** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
  async function switchConfig(name: string): Promise<void> {
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
    await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
  }

  /** Crowdin hashes an Android-XML string's `identifier` server-side (confirmed at
   * crowdin-backend's StringService for the string-based path; the file-based path re-derives the
   * same hash on import - the PHP original observed this live, so it's carried forward here.
   * Re-verify against the .snap / a direct `getString` read on the first live run. */
  function androidIdentifierHash(identifier: string): string {
    return createHash('md5').update(identifier).digest('hex');
  }

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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(result.stdout).toContain("File 'sources/text.txt'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists all source strings', async () => {
    const result = await ctx.runner.run(['string', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(result.stdout).toContain('first string source` with tag');
    expect(result.stdout).toContain("first string source' with quotes");
    expect(result.stdout).toContain('First text string.');
    expect(result.stdout).toContain('Second text string.');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings authenticating via -T/-i against a config without an api_token', async () => {
    await switchConfig('without-token');

    const result = await ctx.runner.run([
      'string',
      'list',
      '-T',
      ctx.env.token as string,
      '-i',
      String(ctx.project.id),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings filtered by file', async () => {
    // Restores the full config (token + project id + both file entries), mirroring the PHP
    // original's `self::prepareConfig()` reset at the start of the equivalent method.
    await switchConfig('default');

    const result = await ctx.runner.run(['string', 'list', '--file', 'android.xml']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('first string');
    expect(result.stdout).toContain('second string');
    expect(result.stdout).toContain('first string source` with tag');
    expect(result.stdout).not.toContain('First text string.');
    expect(result.stdout).not.toContain('Second text string.');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings filtered by identifier/text/context', async () => {
    const result = await ctx.runner.run(['string', 'list', '--filter', 'str1']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('first string');
    expect(result.stdout).not.toContain('second string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings verbosely, including file and context', async () => {
    const result = await ctx.runner.run(['string', 'list', '-v']);

    expect(result.exitCode).toBe(0);
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('str3');
    expect(result.stdout).toContain('third string');
    expect(normalize(result.stdout)).toMatchSnapshot();

    thirdStringId = await findStringId('third string');
    const added = await ctx.client.sourceStringsApi.getString(ctx.project.id, thirdStringId);
    expect(added.data.identifier).toBe(androidIdentifierHash('str3'));
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

    if (result.exitCode !== 0) {
      console.error('DEBUG exitCode:', result.exitCode);
      console.error('DEBUG stdout:', result.stdout);
      console.error('DEBUG stderr:', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('str4');
    expect(result.stdout).toContain('fourth string');
    expect(normalize(result.stdout)).toMatchSnapshot();

    fourthStringId = await findStringId('fourth string');
    const added = await ctx.client.sourceStringsApi.getString(ctx.project.id, fourthStringId);
    expect(added.data.identifier).toBe(androidIdentifierHash('str4'));
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('was updated successfully');
    expect(result.stdout).toContain('third string edited');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const edited = await ctx.client.sourceStringsApi.getString(ctx.project.id, thirdStringId);
    expect(edited.data.identifier).toBe(androidIdentifierHash('str3'));
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('was updated successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const edited = await ctx.client.sourceStringsApi.getString(ctx.project.id, fourthStringId);
    expect(edited.data.identifier).toBe(androidIdentifierHash('str4'));
    expect(edited.data.maxLength).toBe(0);
    expect(edited.data.context).toBe('simple context edited');
    expect(edited.data.isHidden).toBe(false);
  });

  test('deletes a source string', async () => {
    const result = await ctx.runner.run(['string', 'delete', String(thirdStringId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('was deleted successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(result.stdout).toContain("File 'sources/text.txt'");
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('str3');
    expect(result.stdout).toContain('third string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('deletes a source string from a branch-scoped file', async () => {
    const id = await findStringId('first string', { branchId });
    const result = await ctx.runner.run(['string', 'delete', String(id)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('was deleted successfully');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing file when listing by file', async () => {
    const result = await ctx.runner.run(['string', 'list', '--file', 'not-exists-file.xml']);

    // Real TS behavior: `resolveSingleFileId` throws a plain CliError (exit 1), unlike the PHP
    // CLI's exit 102 - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("File 'not-exists-file.xml' not found");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('warns then fails adding a string to a missing file', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'not-exists-file.xml']);

    // Real TS behavior: the missing-file warning matches the PHP wording verbatim, but the final
    // thrown error (exit 1, not the PHP CLI's exit 102) is TS-specific - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Project doesn't contain the 'not-exists-file.xml' file");
    expect(result.stdout).toContain('No valid file specified for the string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('fails adding a string to an unsupported file type', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'text.txt']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires non-empty text when adding a string', async () => {
    const result = await ctx.runner.run(['string', 'add', '', '--file', 'android.xml']);

    // The TS CLI rejects an empty text argument itself, before any API call, so the API's dual
    // text/identifier `isEmpty` errors the PHP original observed never occur - see StringCommand.ts.
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Source string text can not be empty');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires an identifier when adding a string without one', async () => {
    const result = await ctx.runner.run(['string', 'add', 'simple string', '--file', 'android.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Value is required and can't be empty");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing string when editing a nonexistent id', async () => {
    const result = await ctx.runner.run(['string', 'edit', '999999', '--text', 'simple string']);

    expect(result.exitCode).toBe(102);
    expect(result.stdout).toContain('String Not Found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('fails editing a string in an unsupported file type', async () => {
    const textFileId = await findFileId('/text.txt');
    const id = await findStringId('First text string.', { fileId: textFileId });
    const result = await ctx.runner.run(['string', 'edit', String(id), '--text', 'simple string']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a missing string when deleting a nonexistent id', async () => {
    const result = await ctx.runner.run(['string', 'delete', '999999']);

    expect(result.exitCode).toBe(102);
    expect(result.stdout).toContain('String Not Found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('fails deleting a string in an unsupported file type', async () => {
    const textFileId = await findFileId('/text.txt');
    const id = await findStringId('First text string.', { fileId: textFileId });
    const result = await ctx.runner.run(['string', 'delete', String(id)]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('does not support online string');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings by a CroQL expression', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', 'type is plain']);

    expect(result.exitCode).toBe(0);
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

    expect(result.exitCode).toBe(0);
    // One copy from the initial upload, one from the branch upload - see "uploads sources to a new
    // branch" above. Counting substring occurrences (not table rows) sidesteps console.table's
    // formatting, mirroring file-groups.test.ts's duplicate-count assertion.
    const matches = result.stdout.split('first string source` with tag</span>').length - 1;
    expect(matches).toBe(2);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists source strings by a CroQL text match with a quote, spanning both branches', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', `text = "first string source' with quotes"`]);

    expect(result.exitCode).toBe(0);
    const matches = result.stdout.split("first string source' with quotes").length - 1;
    expect(matches).toBe(2);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an invalid CroQL expression', async () => {
    const result = await ctx.runner.run(['string', 'list', '--croql', '11111111111']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("The inferred type is not equal to 'bool'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a comment to a source string', async () => {
    const id = await findStringId("first string source' with quotes", { branchId });
    const result = await ctx.runner.run(['comment', 'add', 'Added comment', '--string-id', String(id), '-l', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Added comment');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments', async () => {
    const result = await ctx.runner.run(['comment', 'list']);

    expect(result.exitCode).toBe(0);
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

    expect(result.exitCode).toBe(0);
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();

    contextRequestCommentId = await findCommentId('Added issue string context_request id 10');
  });

  test('lists comments filtered by a specific string id', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--string-id', String(branchStr2Id)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Added comment string id 10');
    expect(result.stdout).toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('resolves a string issue', async () => {
    const result = await ctx.runner.run(['comment', 'resolve', String(contextRequestCommentId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('has been successfully resolved');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists comments filtered by unresolved status', async () => {
    const result = await ctx.runner.run(['comment', 'list', '--status', 'unresolved']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Added comment string id 10');
    // The context-request issue was just resolved above, so it must not show up here anymore.
    expect(result.stdout).not.toContain('Added issue string context_request id 10');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
