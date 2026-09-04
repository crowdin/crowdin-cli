import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ports crowdin-backend/tests/Cli/Common/CliWithoutConfigParamTest.php: upload sources / upload
 * translations / download translations run three ways - discovered via `crowdin.yaml`, discovered
 * via `crowdin.yml`, and with no config file at all, credentials and patterns given as CLI flags.
 *
 * With `--config` omitted the CLI checks `crowdin.yml` then `crowdin.yaml`, in the cwd only. So the
 * `crowdin.yaml` phase requires `crowdin.yml` to be absent, and since `setupSuite` always writes one,
 * `beforeAll` deletes it; every call passes `noConfig: true` so the harness never appends its own
 * `-c`, leaving this suite in full control of which filename exists.
 *
 * PHP's `push`/`pull` helpers hit the aliases of `upload sources` / `download translations`; the
 * explicit subcommand form is used below, as everywhere else in this effort.
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
    expect(result.stdout).toContain("File 'android.xml'");
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
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
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
    expect(result.stdout).toContain("File 'android.xml'");
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
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
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
    expect(result.stdout).toContain("File 'android.xml'");
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
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });
});
