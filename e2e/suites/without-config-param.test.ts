import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ports crowdin-backend/tests/Cli/Common/CliWithoutConfigParamTest.php: upload sources / upload
 * translations / download translations, run three ways -
 *   1. via a config file named `crowdin.yaml` (the alternate default filename) discovered without
 *      an explicit `-c`,
 *   2. the same three again via `crowdin.yml` (the primary default filename), also with no `-c`,
 *   3. upload sources / download translations with zero config file at all, credentials and file
 *      patterns given purely as CLI flags.
 *
 * Per `cli/config.ts`'s `resolveConfigPath`, when `--config` is omitted the CLI checks
 * `DEFAULT_CONFIG_FILES = ['crowdin.yml', 'crowdin.yaml']` in that order, in `process.cwd()` only
 * (no upward search, no other filenames). So phase 1 below requires `crowdin.yml` to be *absent*
 * (otherwise it would win over `crowdin.yaml`), matching the PHP source's own
 * `self::$cli->disableConfig()` call, which deletes `crowdin.yml` right after copying it to
 * `crowdin.yaml`.
 *
 * `setupSuite` always renders and writes its own `crowdin.yml` into the workspace root as part of
 * its standard lifecycle (see the fixture's `config/crowdin.yml` comment) - that file is deleted in
 * `beforeAll` below and every call in this suite passes `noConfig: true`, so the harness never
 * appends its own `-c <config>` (which would otherwise mask exactly what these tests exercise) and
 * this suite fully owns which of `crowdin.yml` / `crowdin.yaml` exists in the workspace root at any
 * point, writing real credentials directly via `Bun.write` (same pattern as identity.test.ts's
 * `writeIdentityFile` / env-variables.test.ts's `writeEnvFile`).
 *
 * ENTERPRISE_MODE branching in the PHP source (base-url selection) doesn't apply here - this e2e
 * harness only ever targets plain crowdin.com, and `base_url`/`--base-url` already default to
 * `https://api.crowdin.com` (`lib/config.ts`'s `ConfigSchema`), so it's omitted below wherever the
 * default already resolves correctly.
 *
 * PHP's `push()`/`pull()` CLI helpers hit the Java CLI's top-level `push`/`pull` aliases, whose
 * default actions are `upload sources` / `download translations` respectively (confirmed in
 * `UploadCommand.ts`/`DownloadCommand.ts`: `alias: 'push'|'pull'`, `defaultAction`/
 * `translationsAction`). Every other suite in this porting effort invokes the explicit subcommand
 * form instead of the bare/aliased top-level command, so tests 7-8 below do the same
 * (`['upload', 'sources', ...]` / `['download', 'translations', ...]`) rather than `['upload']`/
 * `['download']` - functionally identical, just consistent with the rest of the codebase.
 */
async function writeDiscoveryConfig(ctx: SuiteContext, fileName: 'crowdin.yml' | 'crowdin.yaml'): Promise<void> {
  await Bun.write(
    join(ctx.workspace, fileName),
    [
      `project_id: "${ctx.project.id}"`,
      `api_token: "${ctx.env.token}"`,
      `base_path: "."`,
      `base_url: "https://api.crowdin.com"`,
      `preserve_hierarchy: false`,
      ``,
      `files:`,
      `  - source: "/sources/*.xml"`,
      `    translation: "/translations/%two_letters_code%/%original_file_name%"`,
    ].join('\n'),
  );
}

describe('cli commands without an explicit config parameter', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('without-config-param', { targetLanguageIds: ['it', 'uk'] });

    // Drop setupSuite's own auto-rendered crowdin.yml (see the fixture comment) and start phase 1
    // with only crowdin.yaml present, mirroring the PHP setUpBeforeClass's
    // copy(crowdin.yml, crowdin.yaml) + disableConfig() (which deletes crowdin.yml).
    await rm(join(ctx.workspace, 'crowdin.yml'), { force: true });
    await writeDiscoveryConfig(ctx, 'crowdin.yaml');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'sources'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'translations'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['download', 'translations'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });

  test('uploads sources via crowdin.yml default discovery (no -c)', async () => {
    // Phase 2: flip back to crowdin.yml only, mirroring the PHP source's
    // rename(crowdin.yaml, crowdin.yml) at the top of testUploadSourcesYml.
    await writeDiscoveryConfig(ctx, 'crowdin.yml');
    await rm(join(ctx.workspace, 'crowdin.yaml'), { force: true });

    const result = await ctx.runner.run(['upload', 'sources'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations via crowdin.yml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'translations'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'translations/it/android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations via crowdin.yml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['download', 'translations'], { noConfig: true, cwd: ctx.workspace });

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });

  test('uploads sources using only CLI flags, no config file at all', async () => {
    // PHP's testUploadTranslationWithoutConfig (CN-41531 regression) - `-s`/`-t` alone must fully
    // replace the config file. Per `cli/config.ts`'s `needsConfigFile`, giving both --source and
    // --translation skips reading any config file entirely, so the crowdin.yml left over from the
    // previous test (still sitting in the workspace root) is simply ignored. Translation pattern
    // here has no leading slash, matching the PHP source's literal CLI-flag value (as opposed to
    // the leading-slash pattern used in the config-file fixture above).
    const result = await ctx.runner.run(
      [
        'upload',
        'sources',
        '-s',
        'sources/android.xml',
        '-t',
        'translations/%two_letters_code%/%original_file_name%',
        '-i',
        String(ctx.project.id),
        '-T',
        ctx.env.token as string,
        '--no-progress',
        '--no-colors',
      ],
      { noConfig: true },
    );

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations using only CLI flags, no config file at all', async () => {
    // PHP's testDownloadTranslationWithoutConfig (same CN-41531 regression, download side).
    const result = await ctx.runner.run(
      [
        'download',
        'translations',
        '-s',
        'sources/android.xml',
        '-t',
        'translations/%two_letters_code%/%original_file_name%',
        '-i',
        String(ctx.project.id),
        '-T',
        ctx.env.token as string,
        '--no-progress',
        '--no-colors',
      ],
      { noConfig: true },
    );

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/android.xml extracted');
    expect(result.stdout).toContain('File translations/uk/android.xml extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });
});
