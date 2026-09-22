import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFailure } from '../helpers/cli.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

// One config broken in one place per test. A non-existent organization is not covered: the base URL
// comes from the harness (`CROWDIN_E2E_ORGANIZATION`), and a wrong one fails the same way on every command.
describe('invalid credentials', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('invalid-credentials');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('rejects a non-numeric project_id', async () => {
    // A leading-space project_id (' 999999') would be trimmed and accepted by `z.coerce.number()`, so
    // the value here is genuinely non-numeric.
    await switchConfig(ctx, 'invalid-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expectFailure(result, 2, "Option 'project_id' must be a numeric value");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a project that does not exist', async () => {
    await switchConfig(ctx, 'nonexistent-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expectFailure(result, 102);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stderr).toContain('Not Found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports an invalid api_token', async () => {
    // 401 is the one API status `mapCrowdinError` answers with a fixed message of its own, so the
    // wording can be asserted exactly.
    await switchConfig(ctx, 'invalid-token');

    const result = await ctx.runner.run(['upload', 'sources']);

    expectFailure(result, 101, "Couldn't authorize. Check your 'api_token'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a base_path that does not exist', async () => {
    await switchConfig(ctx, 'nonexistent-base-path');

    const result = await ctx.runner.run(['upload', 'sources']);

    expectFailure(
      result,
      2,
      'Configuration file is invalid. Check the following parameters',
      "The base path '/not/exists/path' was not found. Check your 'base_path' for possible typos and/or capitalization mismatches",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an invalid base_url', async () => {
    // The wording is the config schema's own.
    await switchConfig(ctx, 'invalid-base-url');

    const result = await ctx.runner.run(['upload', 'sources']);

    expectFailure(
      result,
      2,
      'base_url must be a Crowdin URL (e.g. https://api.crowdin.com or https://<org>.crowdin.com)',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
