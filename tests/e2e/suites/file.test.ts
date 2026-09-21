import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { expectFailure } from '../helpers/cli.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { runJson, type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `file upload` / `download` / `delete` (`cli/commands/file/FileCommand.ts`).
 *
 * These address a single file by its Crowdin path, which is a different code path from the
 * config-driven `upload sources` / `download translations` the rest of the suites exercise - no
 * `files` section is involved, the destination comes from the argument and `--dest`.
 */
const SOURCE_FILE = 'sources/app.xml';
const EXTRA_FILE = 'sources/extra.xml';
const BRANCH = 'feature';

describe('file', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('file');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  async function listedPaths(args: string[] = []): Promise<string[]> {
    return (await runJson<{ path: string }[]>(ctx, ['file', 'list', ...args])).map((file) => file.path).sort();
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['file']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Manage source files and translations in a Crowdin project');

    for (const subcommand of ['list', 'upload', 'download', 'delete']) {
      expect(result.stdout).toContain(subcommand);
    }
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['file', 'bogus']);

    expectFailure(result, 2, "unknown command 'bogus'");
  });

  test('requires a file path on upload', async () => {
    const result = await ctx.runner.run(['file', 'upload']);

    expectFailure(result, 2, "missing required argument 'file'");
  });

  test('fails to upload a local file that does not exist', async () => {
    const result = await ctx.runner.run(['file', 'upload', 'sources/missing.xml']);

    expectFailure(result, 1, "File 'sources/missing.xml' not found in the Crowdin project");
  });

  test('refuses to upload a directory', async () => {
    const result = await ctx.runner.run(['file', 'upload', 'sources']);

    expectFailure(result, 1, 'The specified file is a directory');
  });

  test('requires --type alongside --parser-version', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '--parser-version', '2']);

    expectFailure(result, 1, "'--type' is required for '--parser-version' option");
  });

  test('requires --language for an offline translation file', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '--xliff']);

    expectFailure(result, 1, "'--language' parameter is required for offline translation file");
  });

  test('refuses --dest for an offline translation file', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '--xliff', '-l', 'uk', '-d', '/somewhere']);

    expectFailure(result, 1, "'--dest' parameter can not be used for offline translation file");
  });

  test('uploads a file, creating its directory', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'sources'");
    expect(result.stdout).toContain(SOURCE_FILE);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listedPaths()).toEqual([`/${SOURCE_FILE}`]);
  });

  test('updates the file on a second upload', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`File '${SOURCE_FILE}'`);
    expect(await listedPaths()).toEqual([`/${SOURCE_FILE}`]);
  });

  test('skips an existing file with --no-auto-update', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '--no-auto-update']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`Project already contains the file '${SOURCE_FILE}'`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // plain lists only what changed, so a skipped upload prints nothing at all (`reportFiles`).
  test('reports a skipped upload in json but not in plain', async () => {
    expect(await runJson(ctx, ['file', 'upload', SOURCE_FILE, '--no-auto-update'])).toEqual([
      { path: SOURCE_FILE, action: 'skipped', reason: 'auto-update disabled' },
    ]);

    const plain = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '--no-auto-update', '--output', 'plain']);

    expect(plain).toMatchObject({ exitCode: 0 });
    expect(plain.stdout.trim()).toBe('');
  });

  test('uploads a file to a --dest path of its own', async () => {
    const result = await ctx.runner.run(['file', 'upload', SOURCE_FILE, '-d', '/custom/renamed.xml']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'custom'");
    expect(result.stdout).toContain('custom/renamed.xml');
    expect(await listedPaths()).toEqual(['/custom/renamed.xml', `/${SOURCE_FILE}`]);
  });

  test('uploads a file into a branch it creates', async () => {
    const result = await ctx.runner.run(['file', 'upload', EXTRA_FILE, '-b', BRANCH]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`Branch '${BRANCH}'`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listedPaths(['-b', BRANCH])).toEqual([`/${EXTRA_FILE}`]);
    // The root listing is scoped to the files outside every branch.
    expect(await listedPaths()).toEqual(['/custom/renamed.xml', `/${SOURCE_FILE}`]);
  });

  test('downloads a source file back to its own path', async () => {
    const result = await ctx.runner.run(['file', 'download', `/${SOURCE_FILE}`]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`File '/${SOURCE_FILE}'`);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await Bun.file(join(ctx.workspace, SOURCE_FILE)).text()).toContain('Welcome aboard');
  });

  test('downloads a source file into --dest', async () => {
    const result = await ctx.runner.run(['file', 'download', `/${SOURCE_FILE}`, '-d', 'downloaded']);

    expect(result).toMatchObject({ exitCode: 0 });
    await expectFilesExist(ctx.workspace, 'downloaded/app.xml');
  });

  test('fails to download a file the project does not hold', async () => {
    const result = await ctx.runner.run(['file', 'download', '/sources/missing.xml']);

    expectFailure(result, 1, "File '/sources/missing.xml' not found in the Crowdin project");
  });

  test('uploads a translation for a file', async () => {
    const result = await ctx.runner.run(['file', 'upload', 'translations/uk/app.xml', '-l', 'uk', '-d', SOURCE_FILE]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/uk/app.xml'");
  });

  test('downloads the translations of a file', async () => {
    const result = await ctx.runner.run(['file', 'download', `/${SOURCE_FILE}`, '-l', 'uk']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`File 'uk/${SOURCE_FILE}'`);
    expect(await Bun.file(join(ctx.workspace, 'uk', SOURCE_FILE)).text()).toContain('Ласкаво просимо');
  });

  test('rejects a language the project does not have', async () => {
    const result = await ctx.runner.run(['file', 'download', `/${SOURCE_FILE}`, '-l', 'de']);

    expectFailure(result, 1, "Language 'de' doesn't exist in the project");
  });

  test('fails to delete a file the project does not hold', async () => {
    const result = await ctx.runner.run(['file', 'delete', '/sources/missing.xml']);

    expectFailure(result, 1, "File '/sources/missing.xml' not found in the Crowdin project");
  });

  test('deletes a file inside a branch', async () => {
    const result = await ctx.runner.run(['file', 'delete', `/${EXTRA_FILE}`, '-b', BRANCH]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`File '/${EXTRA_FILE}' deleted`);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listedPaths(['-b', BRANCH])).toEqual([]);
  });

  test('deletes a file', async () => {
    const result = await ctx.runner.run(['file', 'delete', '/custom/renamed.xml']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File '/custom/renamed.xml' deleted");
    expect(await listedPaths()).toEqual([`/${SOURCE_FILE}`]);
  });

  // An empty argument satisfies commander's `<file>` and reaches the command's own guard - the
  // shape of `crowdin file download "$VAR"` with an unset variable.
  test.each([['upload'], ['download'], ['delete']])('rejects an empty file path on %s', async (subcommand) => {
    const result = await ctx.runner.run(['file', subcommand, '']);

    expectFailure(result, 1, 'File path is required');
  });
});
