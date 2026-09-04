import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { generate } from '@/lib/config/yamlGenerator.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

// Ports crowdin-backend/tests/Cli/Common/CliInitTest.php. `init --quiet` never talks to the API,
// so the project this suite creates is only there to keep the standard lifecycle.
describe('init generates a configuration skeleton', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('init');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('generates a configuration skeleton in quiet mode', async () => {
    const destPath = join(ctx.workspace, 'crowdin.yaml');
    // normalize() masks the workspace root, so stdout assertions use the masked path.
    const maskedDest = normalize(destPath);

    // `init` has no config to point `-c` at, and resolves a relative `-d` against cwd.
    const result = await ctx.runner.run(['init', '--quiet', '-d', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(0);

    const stdout = normalize(result.stdout);
    expect(stdout).toContain(`Generating Crowdin CLI configuration skeleton '${maskedDest}'`);
    expect(stdout).toContain(
      'Your configuration skeleton has been successfully generated. Specify your source and translation paths in the files section. For more details see https://crowdin.github.io/crowdin-cli/configuration',
    );
    expect(stdout).toMatchSnapshot();

    // With no credentials passed, the generated file omits `api_token` entirely and keeps the real
    // `base_url` - both differ from the PHP fixture, which is why it is not compared against.
    const expectedContent = generate({
      projectId: '',
      apiToken: undefined,
      basePath: '',
      baseUrl: 'https://api.crowdin.com',
      preserveHierarchy: true,
      ignoreHiddenFiles: true,
      files: [{ source: '', translation: '' }],
    });

    expect(await Bun.file(destPath).text()).toBe(expectedContent);
  });

  test('writes flag values into the skeleton in quiet mode', async () => {
    // The empty case above never exercises the flag-to-file wiring; with values passed the
    // `api_token` line appears alongside the custom base_url, preserve_hierarchy and project id.
    const destPath = join(ctx.workspace, 'crowdin-full.yml');

    const result = await ctx.runner.run(
      [
        'init',
        '--quiet',
        '-d',
        'crowdin-full.yml',
        '--project-id',
        '123',
        '--token',
        'abc',
        '--base-url',
        'https://acme.api.crowdin.com',
        '--base-path',
        'src',
        '--source',
        'src/**/*.json',
        '--translation',
        'l10n/%locale%/%original_file_name%',
        '--no-preserve-hierarchy',
      ],
      { noConfig: true },
    );

    expect(result.exitCode).toBe(0);

    const content = await Bun.file(destPath).text();
    const expectedContent = generate({
      projectId: 123,
      apiToken: 'abc',
      basePath: 'src',
      baseUrl: 'https://acme.api.crowdin.com',
      preserveHierarchy: false,
      ignoreHiddenFiles: true,
      files: [{ source: 'src/**/*.json', translation: 'l10n/%locale%/%original_file_name%' }],
    });

    expect(content).toBe(expectedContent);
    // The load-bearing difference from the empty case.
    expect(content).toContain('api_token');
  });

  test('skips regeneration when the destination already exists', async () => {
    const destPath = join(ctx.workspace, 'crowdin.yaml');
    const maskedDest = normalize(destPath);
    const contentBefore = await Bun.file(destPath).text();

    const result = await ctx.runner.run(['init', '--quiet', '-d', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(0);

    const stdout = normalize(result.stdout);
    expect(stdout).toContain(`Generating Crowdin CLI configuration skeleton '${maskedDest}'`);
    expect(stdout).toContain(
      `File '${maskedDest}' already exists. Fill it out accordingly to the following requirements: ` +
        'https://developer.crowdin.com/configuration-file/#configuration-file-structure',
    );
    expect(stdout).toMatchSnapshot();

    // Must skip regeneration, not overwrite the existing file.
    expect(await Bun.file(destPath).text()).toBe(contentBefore);
  });

  test('lints the generated (incomplete) skeleton', async () => {
    // Points --config at the previous test's skeleton; the auto-appended `-c` would override it.
    const result = await ctx.runner.run(['config', 'lint', '--config', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(2);

    // Lint failures are diagnostics, so the whole report is on stderr and stdout stays empty.
    const stderr = normalize(result.stderr);
    expect(stderr).toContain('Configuration file is invalid.');
    // Divergence from PHP, whose message is capitalized and ends with "Specify the source paths...".
    expect(stderr).toContain('source parameter cannot be empty');
    expect(stderr).toContain('translation parameter cannot be empty');
    // The empty `project_id` fails as a zod range error rather than PHP's "Required option" one,
    // and `api_token` is absent from the skeleton entirely - left to the snapshot, since the
    // remaining wording is zod's own.
    expect(stderr).toMatchSnapshot();
  });

  test('creates missing parent directories for a nested destination', async () => {
    // The parent directory does not exist: init relies on Bun.write creating it.
    const destPath = join(ctx.workspace, 'nested', 'sub', 'crowdin.yml');
    const result = await ctx.runner.run(['init', '--quiet', '-d', 'nested/sub/crowdin.yml'], { noConfig: true });

    expect(result.exitCode).toBe(0);
    expect(await Bun.file(destPath).exists()).toBe(true);
  });
});
