import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Upload sources / upload translations / download translations run three ways - discovered via `crowdin.yaml`, discovered
 * via `crowdin.yml`, and with no config file at all, credentials and patterns given as CLI flags.
 *
 * With `--config` omitted the CLI checks `crowdin.yml` then `crowdin.yaml`, in the cwd only. So the
 * `crowdin.yaml` phase requires `crowdin.yml` to be absent, so `beforeAll` renames the one
 * `setupSuite` writes to `crowdin.yaml`, and the `crowdin.yml` phase renames it back; every call passes `noConfig: true` so the harness never appends its own
 * `-c`, leaving this suite in full control of which filename exists.
 */
describe('cli commands without an explicit config parameter', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('without-config-param', { targetLanguageIds: ['it', 'uk'] });

    // Phase 1: only crowdin.yaml present.
    await rename(join(ctx.workspace, 'crowdin.yml'), join(ctx.workspace, 'crowdin.yaml'));
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'sources'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'translations'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations via crowdin.yaml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['download', 'translations'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });

  test('uploads sources via crowdin.yml default discovery (no -c)', async () => {
    // Phase 2: only crowdin.yml present.
    await rename(join(ctx.workspace, 'crowdin.yaml'), join(ctx.workspace, 'crowdin.yml'));

    const result = await ctx.runner.run(['upload', 'sources'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations via crowdin.yml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['upload', 'translations'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations via crowdin.yml default discovery (no -c)', async () => {
    const result = await ctx.runner.run(['download', 'translations'], { noConfig: true, cwd: ctx.workspace });

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });

  test('uploads sources using only CLI flags, no config file at all', async () => {
    // `-s`/`-t` together skip reading any config file, so the crowdin.yml left
    // over from the previous test is ignored.
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations using only CLI flags, no config file at all', async () => {
    // Same as above, download side.
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });
});
