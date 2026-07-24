import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * `download --keep-archive` prints `Archive saved to <config.basePath>/<name>` and `config.basePath`
 * is resolved to an *absolute* path (see `resolveBasePath` in `cli/config.ts`), so it always embeds
 * the per-run temp workspace dir. Redact it before snapshotting so the `.snap` doesn't bake in a
 * machine/run-specific path that would never match again.
 */
function redactWorkspace(ctx: SuiteContext, text: string): string {
  return text.split(ctx.workspace).join('<workspace>');
}

/**
 * Unlike the Java/PHP CLI (`CrowdinTranslations_<timestamp>.zip`), `DownloadCommand.ts` names the
 * kept archive deterministically (`crowdin-translations.zip`, or `-<index>.zip` if multiple export
 * groups are built - not the case for this suite's single `files:` entry). Still scan for it rather
 * than hardcoding the name, mirroring the PHP test's `getZipFileName` directory scan.
 */
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory root created');
    expect(result.stdout).toContain('Directory folder created');
    expect(result.stdout).toContain('Directory {{cookiecutter.module_name}} created');
    expect(result.stdout).toContain("File 'root/android.xml'");
    expect(result.stdout).toContain("File 'root/folder/android.xml'");
    expect(result.stdout).toContain("File 'root/{{cookiecutter.module_name}}/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews downloading all translations (dry run)', async () => {
    const result = await ctx.runner.run(['download', '--all', '--dryrun']);

    expect(result.exitCode).toBe(0);
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

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/it/folder/android.xml extracted');
    expect(result.stdout).toContain('File translations/it/{{cookiecutter.module_name}}/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/folder/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/{{cookiecutter.module_name}}/android.xml extracted');
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'root/android.xml'");
    expect(result.stdout).toContain("File 'root/folder/android.xml'");
    expect(result.stdout).toContain("File 'root/{{cookiecutter.module_name}}/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for the branch', async () => {
    await rm(join(ctx.workspace, 'files', 'translations'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', '-b', 'b1', '--all']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/it/folder/android.xml extracted');
    expect(result.stdout).toContain('File translations/it/{{cookiecutter.module_name}}/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/folder/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/{{cookiecutter.module_name}}/android.xml extracted');
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Couldn't find any file to download. Since you are using the 'Skip untranslated files' option, please " +
        'make sure you have fully translated files',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('keeps the downloaded archive for the branch', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '-b', 'b1', '--all']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Branch 'b1' deleted");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('keeps the downloaded archive', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '--all']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);
  });

  test('keeps the downloaded archive for a single language', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '-l', 'uk', '--all']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translations for languages: uk');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/folder/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/{{cookiecutter.module_name}}/android.xml extracted');
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);
  });

  // `--plain` (PHP/Java) has no equivalent flag in src-next - the only machine-readable output
  // switch is `--output <format>` (`cli/commands/global/options.ts`), which this substitutes with
  // `--output plain`. That format gates `output.success`/`output.info` on `format === 'text'`
  // (`cli/utils/output.ts`), and the real (non-dryrun) download path never calls `output.table(...)`
  // - so unlike the PHP CLI (which lists the zip filename + extracted paths in plain text), this
  // command likely prints nothing at all under `--output plain`. Assert on-disk effects only; let
  // the snapshot capture whatever stdout actually is instead of guessing.
  test('keeps the downloaded archive with plain output', async () => {
    await removeKeptArchive(ctx);

    const result = await ctx.runner.run(['download', '--keep-archive', '--output', 'plain', '--all']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(redactWorkspace(ctx, result.stdout))).toMatchSnapshot();

    const zipName = await findKeptArchive(ctx);
    expect(zipName).toBeDefined();
    expect(await Bun.file(join(ctx.workspace, 'files', zipName as string)).exists()).toBe(true);

    await expectFilesExist(ctx.workspace, 'files/translations/it/android.xml', 'files/translations/uk/android.xml');
  });
});
