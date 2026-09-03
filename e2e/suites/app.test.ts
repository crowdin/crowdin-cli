import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

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

interface ListedApp {
  identifier: string;
  name: string;
}

describe('app', () => {
  let ctx: SuiteContext;

  let installedByThisRun = false;
  let listedApps: ListedApp[];

  async function listInstalled(): Promise<ListedApp[]> {
    const result = await ctx.runner.run(['app', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ListedApp[];
  }

  beforeAll(async () => {
    ctx = await setupSuite('app', { withoutProject: true });
  });

  afterAll(async () => {
    // Gated on `installedByThisRun` so a pre-existing installation someone else made survives.
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

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage apps');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('install');
    expect(result.stdout).toContain('uninstall');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['app', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('lists the installed applications as structured data', async () => {
    const result = await ctx.runner.run(['app', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    listedApps = JSON.parse(result.stdout) as ListedApp[];

    expect(Array.isArray(listedApps)).toBe(true);

    for (const app of listedApps) {
      expect(Object.keys(app).sort()).toEqual(['identifier', 'name']);
      expect(typeof app.identifier).toBe('string');
      expect(typeof app.name).toBe('string');
    }
  });

  test('lists identifiers alone with --output plain', async () => {
    const result = await ctx.runner.run(['app', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.split('\n').filter((line) => line.length > 0)).toEqual(
      listedApps.map((app) => app.identifier),
    );
  });

  test('renders the same applications in the default text format', async () => {
    const result = await ctx.runner.run(['app', 'list']);

    expect(result.exitCode).toBe(0);

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

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'identifier'");
  });

  test('reports an identifier that is not in the Crowdin Store', async () => {
    const result = await ctx.runner.run(['app', 'install', UNKNOWN_IDENTIFIER]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      `Application with identifier '${UNKNOWN_IDENTIFIER}' doesn't exist in Crowdin Store`,
    );
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('requires an identifier to uninstall', async () => {
    const result = await ctx.runner.run(['app', 'uninstall']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'identifier'");
  });

  test('fails to uninstall an application that is not installed', async () => {
    const result = await ctx.runner.run(['app', 'uninstall', UNKNOWN_IDENTIFIER]);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain(`Failed to uninstall application '${UNKNOWN_IDENTIFIER}'`);
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

    expect(result.exitCode).toBe(0);
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

  test('uninstalls the application again', async () => {
    const result = await ctx.runner.run(['app', 'uninstall', INSTALLABLE_IDENTIFIER]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Application has been uninstalled');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('no longer lists the uninstalled application', async () => {
    expect(await listInstalled()).not.toContainEqual({
      identifier: INSTALLABLE_IDENTIFIER,
      name: INSTALLABLE_NAME,
    });
  });

  // Last: switchConfig replaces the config every later run would use.
  test('requires project_id even though no subcommand sends one', async () => {
    await switchConfig(ctx, 'no-project-id');

    // `envFallbackLayer` reads CROWDIN_PROJECT_ID as the lowest config layer and the repo `.env`
    // sets it, so omitting it from the config is not enough to make it missing.
    const result = await ctx.runner.run(['app', 'list'], { env: { CROWDIN_PROJECT_ID: undefined } });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Required option 'project_id' is missing");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });
});
