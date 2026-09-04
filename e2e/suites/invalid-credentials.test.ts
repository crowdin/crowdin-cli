import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

// Ports crowdin-backend/tests/Cli/Common/CliInvalidCredentialsTest.php: one config broken in one
// place per test. PHP's `testUploadSourcesNotExistsOrganization` is dropped rather than adapted -
// it skips itself outside Enterprise mode, and this harness only ever talks to plain crowdin.com.
describe('invalid credentials', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('invalid-credentials');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('rejects a non-numeric project_id', async () => {
    // PHP's fixture uses a leading-space project_id (' 999999'), which `z.coerce.number()` trims and
    // accepts, so the value here is genuinely non-numeric instead.
    await switchConfig(ctx, 'invalid-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Option 'project_id' must be a numeric value");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a project that does not exist', async () => {
    await switchConfig(ctx, 'nonexistent-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(102);
    expect(result.stdout).toContain('Fetching project info');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports an invalid api_token', async () => {
    // 401 is the one API status `mapCrowdinError` answers with a fixed message of its own, so the
    // wording can be asserted exactly.
    await switchConfig(ctx, 'invalid-token');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(101);
    expect(result.stderr).toContain("Couldn't authorize. Check your 'api_token'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a base_path that does not exist', async () => {
    // Divergence from Java, which appends a trailing slash to the path in this message.
    await switchConfig(ctx, 'nonexistent-base-path');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Configuration file is invalid. Check the following parameters');
    expect(result.stderr).toContain(
      "The base path '/not/exists/path' was not found. Check your 'base_path' for possible typos and/or capitalization mismatches",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an invalid base_url', async () => {
    // The wording is the config schema's own, unrelated to Java's "Unexpected 'base_url'".
    await switchConfig(ctx, 'invalid-base-url');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain(
      'base_url must be a Crowdin URL (e.g. https://api.crowdin.com or https://<org>.crowdin.com)',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
