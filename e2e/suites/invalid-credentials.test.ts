import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

// Ports crowdin-backend/tests/Cli/Common/CliInvalidCredentialsTest.php. Every PHP method calls
// `uploadSources()` against a config broken in exactly one place (project_id/api_token/base_path/
// base_url/organization) and asserts the Java CLI's message + exit code. `getConfig` in
// `cli/config.ts` validates project_id/base_path/base_url entirely offline before any network call
// (confirmed by running the CLI directly against a scratch config, no token required - see the
// per-test comments below for the exact commands/output), so those three scenarios are reproduced
// verbatim; the project_id and api_token scenarios that only fail once the API is asked need this
// suite's real project/token and are only reachable at CLI-run time.
//
// `testUploadSourcesNotExistsOrganization` is dropped, not adapted: the PHP method itself opens
// with `if (!ENTERPRISE_MODE) { $this->markTestSkipped(); }`, and this e2e harness has no notion of
// a Crowdin Enterprise organization at all - `e2e/helpers/env.ts`'s `E2eEnv` carries only a personal
// token, and `e2e/helpers/project.ts`'s client is always built against plain crowdin.com. So the PHP
// test never runs against SaaS either; porting it as a no-op would just fake coverage.
describe('invalid credentials', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('invalid-credentials');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  /** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
  async function switchConfig(name: string): Promise<void> {
    const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
    await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
  }

  test('rejects a non-numeric project_id', async () => {
    // PHP's fixture uses a leading-space project_id (' 999999') to trigger Java's "must be a numeric
    // value" check. `z.coerce.number()` (lib/config.ts) runs the value through JS's `Number(...)`,
    // which trims whitespace and would coerce ' 999999' to 999999 - not an error at all in src-next -
    // so that literal value can't reproduce this scenario here. Using a genuinely non-numeric value
    // instead. Confirmed offline (no live API - config validation runs before any network call):
    //   $ bun src-next/cli.ts upload sources -c <config with project_id: "not-a-number"> --no-progress --no-colors
    //   ■  ✖ Invalid input: expected number, received NaN
    //     → at projectId
    //   exit 2
    await switchConfig('invalid-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Invalid input: expected number, received NaN');
    expect(result.stdout).toContain('at projectId');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports a project that does not exist', async () => {
    // Needs a live API round-trip against a real (wrong) project id, so unlike the config-only
    // scenarios above this can't be confirmed offline - left mostly to the snapshot. The spinner's
    // start message is grepped verbatim from `cli/services/ProjectService.ts`'s `loadProject()`.
    await switchConfig('nonexistent-project-id');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(102);
    expect(result.stdout).toContain('Fetching project info');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports an invalid api_token', async () => {
    // 401 is the one API-error status `cli/errors/toCliError.ts`'s `mapCrowdinError` gives a fixed,
    // non-API-derived message for - grepped verbatim below - so this can be asserted exactly despite
    // needing a live round-trip.
    await switchConfig('invalid-token');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(101);
    expect(result.stdout).toContain("Couldn't authorize. Check your 'api_token'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects a base_path that does not exist', async () => {
    // Confirmed offline (no live API - config validation runs before any network call):
    //   $ bun src-next/cli.ts upload sources -c <config with base_path: "/not/exists/path"> --no-progress --no-colors
    //   ■  Configuration file is invalid. Check the following parameters in your configuration file:
    //   	- The base path /not/exists/path was not found. Check your 'base_path' for possible typos and/or capitalization mismatches
    //   exit 2
    // Note the divergence from the PHP fixture: Java's message appends a trailing slash to the path
    // ("/not/exists/path/"); src-next's `checkResolvedConfig` (lib/config.ts) echoes `config.basePath`
    // as resolved, with no trailing slash added.
    await switchConfig('nonexistent-base-path');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('Configuration file is invalid. Check the following parameters');
    expect(result.stdout).toContain(
      "The base path /not/exists/path was not found. Check your 'base_path' for possible typos and/or capitalization mismatches",
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an invalid base_url', async () => {
    // Confirmed offline (no live API - config validation runs before any network call):
    //   $ bun src-next/cli.ts upload sources -c <config with base_url: "http://crowdin.com"> --no-progress --no-colors
    //   ■  ✖ base_url must be a Crowdin URL (e.g. https://api.crowdin.com or https://<org>.crowdin.com)
    //     → at baseUrl
    //   exit 2
    // Message wording is zod's own (lib/config.ts's ConfigSchema.baseUrl refine), entirely different
    // from Java's "Unexpected 'base_url'..." - grepped verbatim, not guessed.
    await switchConfig('invalid-base-url');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain(
      'base_url must be a Crowdin URL (e.g. https://api.crowdin.com or https://<org>.crowdin.com)',
    );
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
