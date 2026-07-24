import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of `CliIgnoreTest` (crowdin-backend tests/Cli/Common/CliIgnoreTest.php). Exercises the
 * per-file `ignore:` config key (an array of glob patterns excluded from upload) against a fixed
 * 15-file local tree (`ALL_FILES`) with source pattern `/**\/*.*`, plus the project-wide
 * `ignore_hidden_files` setting (`settings.ignore_hidden_files` in YAML, `ignoreHiddenFiles` in
 * `lib/config.ts`, default `true`) against two hidden dotfiles that are deliberately NOT part of
 * `ALL_FILES`.
 *
 * `ignore` differs per row and `writeConfig`/`renderConfig` only substitute
 * `{{projectId}}`/`{{token}}` (and throw on any other `{{...}}`), so each test writes a full
 * `crowdin.yml` directly instead of going through that helper (same approach as `file-type.test.ts`).
 *
 * Local glob engine: confirmed this session (see `lib/config/sourceFileLoader.ts`) that both
 * `source` and `ignore` patterns are matched with Bun's built-in `Glob` (`bun:Glob`, not
 * micromatch/fast-glob), which DOES support `?`, `[0-9]`-style bracket classes, and `**` -
 * verified directly against a throwaway fixture tree before writing this suite. This is a
 * different, more capable engine than the download-side matcher in
 * `lib/config/projectFileMatch.ts` (the one lacking bracket-class support, tracked separately as
 * "Bug 9" in this porting effort's known-bugs notes) - rows 2-9 below all match Java/PHP's
 * documented behavior exactly.
 *
 * KNOWN GAP (new, found this session, not yet in the known-bugs list): row 1's pattern
 * (`%file_name%-%two_letters_code%.%file_extension%`) relies on Java/PHP's per-source-file
 * resolution of the FILE placeholders `%file_name%`/`%file_extension%`/`%original_path%` inside an
 * `ignore` pattern (each candidate source file's own name/extension get substituted before
 * matching, so a file that looks like another file's translation output gets excluded). The TS
 * port's `expandIgnorePatterns` (`lib/export/languagePlaceholders.ts`) only expands LANGUAGE
 * placeholders (`%two_letters_code%`, `%locale%`, etc.); `%file_name%`/`%file_extension%` are left
 * as the literal 7-character substrings `%file_name%`/`%file_extension%` in the glob pattern, which
 * then matches nothing real. Confirmed live (offline, no token) with a throwaway script calling
 * `SourceFileLoader.getFilePathsForPattern` directly against a copy of this suite's fixture tree:
 * with today's code, row 1 uploads all 15 files instead of excluding the 2 `android-uk.xml` copies.
 * Row 1 below is written to the CORRECT/intended (PHP-parity) expectation anyway, per this effort's
 * practice of leaving discovered divergences as regression markers rather than silently dodging them
 * - so it is expected to go red until this gap is fixed.
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

/** Writes crowdin.yml for a single ignore-pattern data-provider row (fixed source/translation). */
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

/** Writes crowdin.yml for the fixed-source (`/folder/**\/*.*`) `ignore_hidden_files` toggle tests. */
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
 * Equivalent of the PHP suite's `ProjectFilesHelper::deleteAllFiles()`, extended to also delete
 * root-level directories. PHP's `deleteAllFiles()` deletes root-level *nodes* (which, on the legacy
 * API it uses, include folders - deleting a root folder cascades to its whole subtree), so each row
 * starts from a truly empty project, and `folder`/`folder/sub` get re-created (and re-announced in
 * stdout) on every subsequent upload. The other suites' `deleteAllProjectFiles` helper only deletes
 * files (via `sourceFilesApi.deleteFile`), which is enough when directories never need to disappear
 * between tests; this suite's directory-creation assertions (the last two tests) depend on a clean
 * directory tree each time, so directories are deleted here too.
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

/** Equivalent of the PHP suite's `ProjectFilesHelper::getFilePaths(true)`. */
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

    expect(result.exitCode).toBe(0);

    const ignoredFiles = ['/android-uk.xml', '/folder/android-uk.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a single-char wildcard (?.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/?.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

    const ignoredFiles = ['/1.xml', '/a.xml', '/folder/1.xml', '/folder/a.xml', '/folder/sub/1.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a single-digit bracket class ([0-9].xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9].xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

    const ignoredFiles = ['/1.xml', '/folder/1.xml', '/folder/sub/1.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a three-digit bracket class ([0-9][0-9][0-9].xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9][0-9][0-9].xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

    const ignoredFiles = ['/123.xml', '/folder/123.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('ignores files matching a digit-star-underscore bracket class ([0-9]*_*.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/[0-9]*_*.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

    const ignoredFiles = ['/123_test.xml', '/folder/123_test.xml'];
    const expectedFiles = ALL_FILES.filter((file) => !ignoredFiles.includes(file)).sort();
    expect(await projectFilePaths(ctx)).toEqual(expectedFiles);
  });

  test('combines two ignore patterns (?.xml and [0-9]*_*.xml)', async () => {
    await resetProject(ctx);
    await writeConfigWithIgnore(ctx, ['/**/?.xml', '/**/[0-9]*_*.xml']);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);

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

    expect(result.exitCode).toBe(0);

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

    expect(result.exitCode).toBe(0);

    // The PHP original's ignoredFiles list also names a nonexistent `/folder/1.txt` here; since that
    // path is not in ALL_FILES, filtering it out is a no-op there and it is omitted here for clarity.
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

    expect(result.exitCode).toBe(0);

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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Directory folder created');
    expect(result.stdout).toContain('Directory sub created');
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Directory folder created');
    expect(result.stdout).toContain('Directory sub created');
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
