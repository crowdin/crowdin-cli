import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { generate } from '@/lib/config/yamlGenerator.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

// Ports crowdin-backend/tests/Cli/Common/CliInitTest.php. `init --quiet` never talks to the API
// (no token/project-id flags are passed), so this suite doesn't strictly need a Crowdin project -
// but it keeps the standard setupSuite/teardownSuite lifecycle for consistency with every other
// suite in this effort; see e2e/fixtures/init/config/crowdin.yml for why that fixture is unused.
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

    // noConfig: true - `init` has no config file to point `-c` at, and the CLI resolves a relative
    // `-d` against cwd (ctx.workspace here), matching InitCommand's `path.join(process.cwd(), ...)`.
    const result = await ctx.runner.run(['init', '--quiet', '-d', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(0);

    const stdout = normalize(result.stdout);
    // Wording grepped verbatim from InitCommand.ts's defaultAction/successMessage.
    expect(stdout).toContain(`Generating Crowdin CLI configuration skeleton '${destPath}'`);
    expect(stdout).toContain(
      'Your configuration skeleton has been successfully generated. Specify your source and translation paths in the files section. For more details see https://crowdin.github.io/crowdin-cli/configuration',
    );
    expect(stdout).toMatchSnapshot();

    // `--quiet` with no --token/--project-id/--base-url means InitCommand calls generate() with
    // apiToken/projectId/basePath all falsy-empty and baseUrl defaulted to the real API host - the
    // exact call importing the real generate() here keeps this from drifting out of sync with the
    // implementation. Confirmed live (2026-07-22): the generated file omits the `api_token` line
    // entirely (generate() only pushes it `if apiToken !== undefined`) and `base_url` is the real
    // `https://api.crowdin.com`, not empty - both differ from the PHP fixture's `expected/crowdin.yaml`,
    // which is why that fixture is intentionally not used for a file-equality assertion here.
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

  test('skips regeneration when the destination already exists', async () => {
    const destPath = join(ctx.workspace, 'crowdin.yaml');
    const contentBefore = await Bun.file(destPath).text();

    const result = await ctx.runner.run(['init', '--quiet', '-d', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(0);

    const stdout = normalize(result.stdout);
    expect(stdout).toContain(`Generating Crowdin CLI configuration skeleton '${destPath}'`);
    expect(stdout).toContain(
      `File '${destPath}' already exists. Fill it out accordingly to the following requirements: ` +
        'https://developer.crowdin.com/configuration-file/#configuration-file-structure',
    );
    expect(stdout).toMatchSnapshot();

    // Must skip regeneration, not overwrite the existing file.
    expect(await Bun.file(destPath).text()).toBe(contentBefore);
  });

  test('lints the generated (incomplete) skeleton', async () => {
    // noConfig: true - points --config at the skeleton from the previous test, not ctx's own
    // rendered project config (the auto-appended `-c` would otherwise override this one).
    const result = await ctx.runner.run(['config', 'lint', '--config', 'crowdin.yaml'], { noConfig: true });

    expect(result.exitCode).toBe(2);

    const stdout = normalize(result.stdout);
    // Header grepped verbatim from ConfigCommand.ts's getLintErrorMessage.
    expect(stdout).toContain('Configuration file is invalid.');
    // Grepped verbatim from lib/config.ts's ConfigSchema (files[].source/.translation refinements).
    // Note the divergence from the PHP fixture: TS's message is lowercase with no article and no
    // trailing "Specify the source paths..." sentence (PHP: "The 'source' parameter can't be empty.
    // Specify the source paths in your configuration file").
    expect(stdout).toContain('source parameter cannot be empty');
    expect(stdout).toContain('translation parameter cannot be empty');
    // Confirmed live (2026-07-22): unlike the PHP fixture, this generated skeleton never produces
    // "Required option 'project_id'/'api_token' is missing" or the translation-placeholder message.
    // `project_id: ""` coerces to 0 via z.coerce.number(), failing `.gt(0)` with zod's own message
    // instead ("Too small: expected number to be >0") - left to the snapshot below, not hardcoded,
    // since it's zod's default wording rather than something this codebase owns. And `api_token` is
    // entirely absent from the generated file (see the first test), so the schema's optional() field
    // never triggers its own `min(1)` "Required option 'api_token' is missing" check at all.
    expect(stdout).toMatchSnapshot();
  });
});
