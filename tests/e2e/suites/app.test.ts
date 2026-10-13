import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { buildApiUrl } from '@/lib/organization/credentials.ts';
import { expectFailure } from '../helpers/cli.ts';
import { normalize } from '../helpers/normalize.ts';
import { runJson, type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `app list` / `app install` / `app uninstall` (`cli/commands/app/AppCommand.ts`).
 *
 * Installations are account-scoped: none of the three API calls takes a project id. So the suite
 * runs `withoutProject`, `teardownSuite` cannot clean up an install, and `app list` reads shared
 * account state that must never be snapshotted - the output formats are cross-checked against each
 * other instead.
 *
 * The round trip installs `batch-add-strings`: Crowdin-authored and Crowdin-hosted, `scopes:
 * ["project"]` only, one inert menu module, and a manifest `identifier` equal to its Store slug -
 * which matters because `install` resolves a slug while `uninstall` passes the string straight to
 * the API, and the two need not agree for every app.
 */

const UNKNOWN_IDENTIFIER = 'crowdin-cli-e2e-no-such-app-xyz';

const INSTALLABLE_IDENTIFIER = 'batch-add-strings';
const INSTALLABLE_NAME = 'Bulk Add Strings';

// An installed app built on the apps framework (e.g. zendesk-guide); its cases are skipped without one.
const FRAMEWORK_APP = process.env.CROWDIN_E2E_FRAMEWORK_APP;

interface ListedApp {
  identifier: string;
  name: string;
}

describe('app', () => {
  let ctx: SuiteContext;

  let installedByThisRun = false;
  let listedApps: ListedApp[];

  async function listInstalled(): Promise<ListedApp[]> {
    return runJson<ListedApp[]>(ctx, ['app', 'list']);
  }

  beforeAll(async () => {
    ctx = await setupSuite('app', { withoutProject: true });
  });

  afterAll(async () => {
    if (ctx && installedByThisRun && !ctx.env.keep) {
      try {
        await ctx.client.applicationsApi.deleteApplicationInstallation(INSTALLABLE_IDENTIFIER, true);
      } catch {
        // Already removed by the round trip.
      }
    }

    await teardownSuite(ctx);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['app']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Manage apps');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('install');
    expect(result.stdout).toContain('uninstall');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['app', 'bogus']);

    expectFailure(result, 2, "unknown command 'bogus'");
  });

  test('lists the installed applications as structured data', async () => {
    listedApps = await runJson<ListedApp[]>(ctx, ['app', 'list']);

    expect(Array.isArray(listedApps)).toBe(true);

    for (const app of listedApps) {
      expect(Object.keys(app).sort()).toEqual(['identifier', 'name']);
      expect(typeof app.identifier).toBe('string');
      expect(typeof app.name).toBe('string');
    }
  });

  test('lists identifiers alone with --output plain', async () => {
    const result = await ctx.runner.run(['app', 'list', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout.split('\n').filter((line) => line.length > 0)).toEqual(
      listedApps.map((app) => app.identifier),
    );
  });

  test('renders the same applications in the default text format', async () => {
    const result = await ctx.runner.run(['app', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });

    if (listedApps.length === 0) {
      expect(result.stdout).toContain('No applications found');
      return;
    }

    for (const app of listedApps) {
      expect(result.stdout).toContain(`${app.identifier} ${app.name}`);
    }
  });

  test('requires an identifier to install', async () => {
    const result = await ctx.runner.run(['app', 'install']);

    expectFailure(result, 2, "missing required argument 'identifier'");
  });

  test('reports an identifier that is not in the Crowdin Store', async () => {
    const result = await ctx.runner.run(['app', 'install', UNKNOWN_IDENTIFIER]);

    expectFailure(result, 1, `Application with identifier '${UNKNOWN_IDENTIFIER}' doesn't exist in Crowdin Store`);
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('requires an identifier to uninstall', async () => {
    const result = await ctx.runner.run(['app', 'uninstall']);

    expectFailure(result, 2, "missing required argument 'identifier'");
  });

  test('fails to uninstall an application that is not installed', async () => {
    const result = await ctx.runner.run(['app', 'uninstall', UNKNOWN_IDENTIFIER]);

    expectFailure(result, 102, `Failed to uninstall application '${UNKNOWN_IDENTIFIER}'`);
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('installs an application from the Crowdin Store', async () => {
    // A stale install from a crashed run would otherwise fail below with an opaque API error.
    expect(await listInstalled()).not.toContainEqual({
      identifier: INSTALLABLE_IDENTIFIER,
      name: INSTALLABLE_NAME,
    });

    const result = await ctx.runner.run(['app', 'install', INSTALLABLE_IDENTIFIER]);

    installedByThisRun = result.exitCode === 0;

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Application has been installed');
    expect(result.stdout).toContain(`${INSTALLABLE_IDENTIFIER} ${INSTALLABLE_NAME}`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists the newly installed application', async () => {
    expect(await listInstalled()).toContainEqual({
      identifier: INSTALLABLE_IDENTIFIER,
      name: INSTALLABLE_NAME,
    });
  });

  test.each([
    ['json', '[]'],
    ['toon', '[]'],
    ['plain', ''],
  ])('lists no API methods for an app without an api module in %s', async (format, expected) => {
    const result = await ctx.runner.run(['app', 'methods', INSTALLABLE_IDENTIFIER, '--output', format]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout.trim()).toBe(expected);
  });

  test('says so in text when an app declares no API methods', async () => {
    const result = await ctx.runner.run(['app', 'methods', INSTALLABLE_IDENTIFIER]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`Application '${INSTALLABLE_IDENTIFIER}' declares no API methods`);
  });

  test('maps the proxy 404 for an undeclared method', async () => {
    const result = await ctx.runner.run(['app', 'api', INSTALLABLE_IDENTIFIER, 'anything', '-F', 'projectId=1']);

    expectFailure(
      result,
      102,
      `Application '${INSTALLABLE_IDENTIFIER}' is not installed or does not declare 'GET anything'`,
    );
  });

  test('uninstalls the application again', async () => {
    const result = await ctx.runner.run(['app', 'uninstall', INSTALLABLE_IDENTIFIER]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Application has been uninstalled');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('no longer lists the uninstalled application', async () => {
    expect(await listInstalled()).not.toContainEqual({
      identifier: INSTALLABLE_IDENTIFIER,
      name: INSTALLABLE_NAME,
    });
  });

  test('reports methods of an application that is not installed', async () => {
    const result = await ctx.runner.run(['app', 'methods', UNKNOWN_IDENTIFIER]);

    expectFailure(result, 102, `Application '${UNKNOWN_IDENTIFIER}' is not installed`);
  });

  test('reports a call to an application that is not installed', async () => {
    const result = await ctx.runner.run(['app', 'api', UNKNOWN_IDENTIFIER, 'settings']);

    expectFailure(
      result,
      102,
      `Application '${UNKNOWN_IDENTIFIER}' is not installed or does not declare 'GET settings'`,
    );
  });

  test('prints the resolved request on --dryrun without sending it', async () => {
    const result = await ctx.runner.run([
      'app',
      'api',
      UNKNOWN_IDENTIFIER,
      'crowdin-update?x=1',
      '-X',
      'post',
      '-F',
      'projectId=12',
      '-f',
      'entryIds[]=cam_1',
      '--dryrun',
      '--output',
      'json',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(JSON.parse(result.stdout)).toEqual({
      method: 'POST',
      url: `${buildApiUrl(ctx.env.baseUrl)}/applications/${UNKNOWN_IDENTIFIER}/api/crowdin-update?x=1`,
      body: { entryIds: ['cam_1'], projectId: 12 },
    });
  });

  describe.if(Boolean(FRAMEWORK_APP))('framework app', () => {
    const app = FRAMEWORK_APP ?? '';

    test('lists the standard integration methods', async () => {
      const methods = await runJson<Array<{ method: string; path: string }>>(ctx, ['app', 'methods', app]);

      expect(methods).toContainEqual(expect.objectContaining({ method: 'GET', path: 'crowdin-files' }));
      expect(methods).toContainEqual(expect.objectContaining({ method: 'POST', path: 'crowdin-update' }));
    });

    test('describes a method with its parameters', async () => {
      const described = await runJson<{ parameters: Array<{ name: string }> | null }>(ctx, [
        'app',
        'methods',
        app,
        'crowdin-files',
      ]);

      expect(described.parameters).toContainEqual(expect.objectContaining({ name: 'projectId', required: true }));
    });

    test("passes the app's own error through", async () => {
      const result = await ctx.runner.run(['app', 'api', app, 'settings']);

      expectFailure(result, 1, 'Missing required parameter: projectId');
    });
  });

  // Last: switchConfig replaces the config every later run would use.
  test('does not require project_id', async () => {
    await switchConfig(ctx, 'no-project-id');

    expect(Array.isArray(await listInstalled())).toBe(true);
  });

  test.each([['install'], ['uninstall']])('rejects an empty identifier on %s', async (subcommand) => {
    const result = await ctx.runner.run(['app', subcommand, '']);

    expectFailure(result, 1, 'Application identifier can not be empty');
  });
});
