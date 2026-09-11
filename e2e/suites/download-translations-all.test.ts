import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * `--keep-archive` prints `Archive saved to <config.basePath>/<name>`, and `basePath` is absolute, so
 * the line embeds the per-run workspace.
 */
function redactWorkspace(ctx: SuiteContext, text: string): string {
  return text.split(ctx.workspace).join('<workspace>');
}

/** Scanned rather than hardcoded: the name gains an `-<index>` suffix when several export groups are built. */
async function findKeptArchive(ctx: SuiteContext): Promise<string | undefined> {
  const entries = await readdir(join(ctx.workspace, 'files'));
  return entries.find((entry) => entry.startsWith('crowdin-translations') && entry.endsWith('.zip'));
}

async function removeKeptArchive(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'files', 'crowdin-translations.zip'), { force: true });
}

describe('download translations --all', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('download-translations-all', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Directory 'root'");
    expect(result.stdout).toContain("Directory 'root/folder'");
    expect(result.stdout).toContain("Directory 'root/{{cookiecutter.module_name}}'");
    expect(result.stdout).toContain("File 'root/android.xml'");
    expect(result.stdout).toContain("File 'root/folder/android.xml'");
    expect(result.stdout).toContain("File 'root/{{cookiecutter.module_name}}/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading all translations (dry run)', async () => {
    const result = await ctx.runner.run(['download', '--all', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('translations/it/android.xml');
    expect(result.stdout).toContain('translations/it/folder/android.xml');
    expect(result.stdout).toContain('translations/it/{{cookiecutter.module_name}}/android.xml');
    expect(result.stdout).toContain('translations/uk/android.xml');
    expect(result.stdout).toContain('translations/uk/folder/android.xml');
    expect(result.stdout).toContain('translations/uk/{{cookiecutter.module_name}}/android.xml');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads all translations', async () => {
    const result = await ctx.runner.run(['download', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/folder/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/{{cookiecutter.module_name}}/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/folder/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/{{cookiecutter.module_name}}/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'files/translations/it/android.xml',
      'files/translations/it/folder/android.xml',
      'files/translations/uk/android.xml',
      'files/translations/uk/folder/android.xml',
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/folder/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/folder/android.xml')).text(),
    );
  });

  test('uploads sources to a new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'b1']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'root/android.xml'");
    expect(result.stdout).toContain("File 'root/folder/android.xml'");
    expect(result.stdout).toContain("File 'root/{{cookiecutter.module_name}}/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for the branch', async () => {
    await rm(join(ctx.workspace, 'files', 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', '-b', 'b1', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/folder/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/it/{{cookiecutter.module_name}}/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/folder/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/{{cookiecutter.module_name}}/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'files/translations/it/android.xml',
      'files/translations/it/folder/android.xml',
      'files/translations/uk/android.xml',
      'files/translations/uk/folder/android.xml',
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/folder/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/folder/android.xml')).text(),
    );
  });

  test('reports an empty archive when skipping untranslated files', async () => {
    const result = await ctx.runner.run(['download', '--skip-untranslated-files']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain(
      "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, please " +
        'make sure you have fully translated files',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('keeps the downloaded archive for the branch', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '-b', 'b1', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);

    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/it/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/it/folder/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/android.xml')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'files/translations/uk/folder/android.xml')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/translations/uk/folder/android.xml')).text(),
    );
  });

  test('deletes the branch', async () => {
    const result = await ctx.runner.run(['branch', 'delete', 'b1']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("Branch 'b1' deleted");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('keeps the downloaded archive', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);
  });

  test('keeps the downloaded archive for a single language', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '-l', 'uk', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Building translations for languages: uk');
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/folder/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/{{cookiecutter.module_name}}/android.xml' extracted");
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);
  });

  // `--output plain` stands in for the Java `--plain` flag: the closing summary lists the kept zip and
  // the extracted paths.
  test('keeps the downloaded archive with plain output', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '--output', 'plain', '--all']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);

    await expectFilesExist(ctx.workspace, 'files/translations/it/android.xml', 'files/translations/uk/android.xml');
  });

  test('narrows the build to the languages left after --exclude-language', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--exclude-language', 'it', '--dryrun']);

    expect(result).toMatchObject({ exitCode: 0 });
    // Excludes subtract from the project's languages rather than replacing the set, and narrowing
    // it pins the build (lib/download/languages.ts).
    expect(result.stdout).toContain('translations/uk/');
    expect(result.stdout).not.toContain('translations/it/');
  });

  test('rejects --language and --exclude-language together', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-l', 'uk', '--exclude-language', 'it']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--language' and '--exclude-language' options can't be used simultaneously");
  });

  test('rejects an excluded language the project does not target', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--exclude-language', 'de', '--dryrun']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Language 'de' doesn't exist in the project");
  });
});
