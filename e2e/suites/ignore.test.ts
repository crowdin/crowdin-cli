import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of `CliIgnoreTest` (crowdin-backend tests/Cli/Common/CliIgnoreTest.php). Exercises the
 * per-file `ignore:` config key against a fixed 15-file local tree (`ALL_FILES`) with source pattern
 * `/**\/*.*`, plus the project-wide `ignore_hidden_files` setting against two hidden dotfiles that
 * are deliberately NOT part of `ALL_FILES`.
 *
 * `ignore` differs per row and `renderConfig` only substitutes credentials, so each test writes a
 * full `crowdin.yml` directly.
 *
 * Row 1's pattern (`%file_name%-%two_letters_code%.%file_extension%`) relies on each candidate
 * source file's own name/extension being substituted before matching, so a file that looks like
 * another file's translation output gets excluded.
 */

const ALL_FILES = [
  '/1.txt',
  '/1.xml',
  '/123.xml',
  '/123_test.xml',
  '/a.xml',
  '/android-uk.xml',
  '/android.xml',
  '/folder/1.xml',
  '/folder/123.xml',
  '/folder/123_test.xml',
  '/folder/a.xml',
  '/folder/android-uk.xml',
  '/folder/android.xml',
  '/folder/sub/1.txt',
  '/folder/sub/1.xml',
];

async function writeConfigWithIgnore(ctx: SuiteContext, ignore: string[]): Promise<void> {
  const lines = [
    `project_id: "${ctx.project.id}"`,
    `api_token: "${ctx.env.token}"`,
    `base_path: "./files"`,
    `base_url: "https://api.crowdin.com"`,
    `preserve_hierarchy: true`,
    `files:`,
    `  - source: "/**/*.*"`,
    `    translation: "/%original_path%/%file_name%-%two_letters_code%.%file_extension%"`,
    `    ignore:`,
    ...ignore.map((pattern) => `      - "${pattern}"`),
  ];
  await Bun.write(join(ctx.workspace, 'crowdin.yml'), lines.join('\n'));
}

async function writeConfigWithIgnoreHiddenFiles(ctx: SuiteContext, ignoreHiddenFiles: boolean): Promise<void> {
  const lines = [
    `project_id: "${ctx.project.id}"`,
    `api_token: "${ctx.env.token}"`,
    `base_path: "./files"`,
    `base_url: "https://api.crowdin.com"`,
    `preserve_hierarchy: true`,
    `settings:`,
    `  ignore_hidden_files: ${ignoreHiddenFiles}`,
    `files:`,
    `  - source: "/folder/**/*.*"`,
    `    translation: "/translations/%locale%/%original_file_name%"`,
  ];
  await Bun.write(join(ctx.workspace, 'crowdin.yml'), lines.join('\n'));
}

/**
 * Deletes directories as well as files, so each row starts from a truly empty project: the last two
 * tests assert `folder`/`folder/sub` being created, which needs them gone every time.
 */
async function resetProject(ctx: SuiteContext): Promise<void> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
  for (const file of files.data) {
    await ctx.client.sourceFilesApi.deleteFile(ctx.project.id, file.data.id);
  }

  const directories = await ctx.client.sourceFilesApi.listProjectDirectories(ctx.project.id, { recursion: '1' });
  const rootDirectories = directories.data.filter((directory) => !directory.data.directoryId);
  for (const directory of rootDirectories) {
    await ctx.client.sourceFilesApi.deleteDirectory(ctx.project.id, directory.data.id);
  }
}

async function projectFilePaths(ctx: SuiteContext): Promise<string[]> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
  return files.data.map((file) => file.data.path).sort();
}

describe('ignore', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('ignore', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('ignores files matching the translation-placeholder pattern (%file_name%-%two_letters_code%.%file_extension%)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/%file_name%-%two_letters_code%.%file_extension%']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = ['/android-uk.xml', '/folder/android-uk.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a single-char wildcard (?.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/?.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = ['/1.xml', '/a.xml', '/folder/1.xml', '/folder/a.xml', '/folder/sub/1.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a single-digit bracket class ([0-9].xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9].xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = ['/1.xml', '/folder/1.xml', '/folder/sub/1.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a three-digit bracket class ([0-9][0-9][0-9].xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9][0-9][0-9].xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = ['/123.xml', '/folder/123.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a digit-star-underscore bracket class ([0-9]*_*.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9]*_*.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = ['/123_test.xml', '/folder/123_test.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('combines two ignore patterns (?.xml and [0-9]*_*.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/?.xml', '/**/[0-9]*_*.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = [
      '/1.xml',
      '/123_test.xml',
      '/a.xml',
      '/folder/1.xml',
      '/folder/123_test.xml',
      '/folder/a.xml',
      '/folder/sub/1.xml',
    ];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores a recursive glob scoped to a subfolder (/folder/**/*.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/folder/**/*.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = [
      '/folder/1.xml',
      '/folder/123.xml',
      '/folder/123_test.xml',
      '/folder/a.xml',
      '/folder/android-uk.xml',
      '/folder/android.xml',
      '/folder/sub/1.xml',
    ];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores a recursive glob scoped to a subfolder, all extensions (/folder/**/*.*)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/folder/**/*.*']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = [
      '/folder/1.xml',
      '/folder/123.xml',
      '/folder/123_test.xml',
      '/folder/a.xml',
      '/folder/android-uk.xml',
      '/folder/android.xml',
      '/folder/sub/1.txt',
      '/folder/sub/1.xml',
    ];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores a bare folder name, excluding everything under it (/folder)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/folder']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });

    const ignoredFiles = [
      '/folder/1.xml',
      '/folder/123.xml',
      '/folder/123_test.xml',
      '/folder/a.xml',
      '/folder/android-uk.xml',
      '/folder/android.xml',
      '/folder/sub/1.txt',
      '/folder/sub/1.xml',
    ];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('uploads hidden dotfiles when ignore_hidden_files is false', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnoreHiddenFiles(ctx, false);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("Directory 'folder'");
    expect(result.stdout).toContain("Directory 'folder/sub'");
    expect(result.stdout).toContain("File 'folder/.hidden.xml'");
    expect(result.stdout).toContain("File 'folder/1.xml'");
    expect(result.stdout).toContain("File 'folder/123.xml'");
    expect(result.stdout).toContain("File 'folder/123_test.xml'");
    expect(result.stdout).toContain("File 'folder/a.xml'");
    expect(result.stdout).toContain("File 'folder/android-uk.xml'");
    expect(result.stdout).toContain("File 'folder/android.xml'");
    expect(result.stdout).toContain("File 'folder/sub/.hidden.xml'");
    expect(result.stdout).toContain("File 'folder/sub/1.txt'");
    expect(result.stdout).toContain("File 'folder/sub/1.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('skips hidden dotfiles when ignore_hidden_files is true', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnoreHiddenFiles(ctx, true);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain("Directory 'folder'");
    expect(result.stdout).toContain("Directory 'folder/sub'");
    expect(result.stdout).not.toContain('.hidden.xml');
    expect(result.stdout).toContain("File 'folder/1.xml'");
    expect(result.stdout).toContain("File 'folder/123.xml'");
    expect(result.stdout).toContain("File 'folder/123_test.xml'");
    expect(result.stdout).toContain("File 'folder/a.xml'");
    expect(result.stdout).toContain("File 'folder/android-uk.xml'");
    expect(result.stdout).toContain("File 'folder/android.xml'");
    expect(result.stdout).toContain("File 'folder/sub/1.txt'");
    expect(result.stdout).toContain("File 'folder/sub/1.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
