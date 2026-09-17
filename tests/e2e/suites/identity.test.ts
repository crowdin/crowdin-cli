import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { renderFixture, type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * The fixture's `crowdin.yml` carries no credentials at all: they come from `identity.yml`, passed
 * via `--identity` and rendered with the real post-setup values. The identity file outranks the
 * config file but not CLI flags.
 */
describe('identity file credentials', () => {
  let ctx: SuiteContext;
  let identityPath: string;

  beforeAll(async () => {
    ctx = await setupSuite('identity', { targetLanguageIds: ['it', 'uk'] });
    identityPath = await renderFixture(ctx, 'identity.yml');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources using credentials from an --identity file', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--identity', identityPath]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations using credentials from an --identity file', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--identity', identityPath]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml'");
    expect(result.stdout).toContain("File 'translations/uk/android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations using credentials from an --identity file', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--identity', identityPath]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'translations/it/android.xml' extracted");
    expect(result.stdout).toContain("File 'translations/uk/android.xml' extracted");
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'translations/it/android.xml', 'translations/uk/android.xml');
  });

  test('validates the merged configuration via config lint --identity', async () => {
    const result = await ctx.runner.run(['config', 'lint', '--identity', identityPath]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Your configuration file looks good');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
