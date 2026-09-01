import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `app list` / `app install` / `app uninstall` (`cli/commands/app/AppCommand.ts`). There is
 * no PHP original to port here - the Java CLI has no `app` command - so this is written against the
 * TS implementation directly.
 *
 * Scope: installations are **account-scoped**, not project-scoped. `listApplicationInstallations()`,
 * `installApplication()` and `deleteApplicationInstallation()` all take no project id
 * (`cli/services/AppService.ts`). That cuts both ways: this suite is set up with `withoutProject`,
 * since a real project would go unused (`project_id` still has to be *present* in the config,
 * because `app` sits in the project option tier - it is just never sent anywhere); and nothing
 * `teardownSuite` deletes would clean up an install. The install/uninstall round trip below therefore removes what it added,
 * and `afterAll` repeats the removal as a safety net in case a test failed in between.
 *
 * The app it installs is `batch-add-strings` ("Bulk Add Strings"), chosen because it is
 * Crowdin-authored and Crowdin-hosted (so the Store listing and its manifest are not a third
 * party's to withdraw), its manifest `identifier` equals its Store slug (so `install <slug>` and
 * `uninstall <slug>` address the same thing - `install` resolves a slug to a manifest URL while
 * `uninstall` passes the string straight to the API, and the two need not agree for every app),
 * it asks for `scopes: ["project"]` only, and its one module is a `project-tools` menu entry that
 * does nothing until a human opens it.
 *
 * `app list` output is not snapshotted for the same reason - the account's installed apps are
 * shared, mutable state that no test here controls, so a snapshot would encode whatever happened to
 * be installed on the day it was recorded. The three output formats are cross-checked against each
 * other instead, which is deterministic whatever the account holds.
 *
 * Verified offline (no token needed - these paths fail before or outside the Crowdin API):
 *   $ bun src-next/cli.ts app -c <config>                        -> exit 0, help
 *   $ bun src-next/cli.ts app bogus -c <config>                  -> exit 2, "unknown command 'bogus'"
 *   $ bun src-next/cli.ts app install -c <config>                -> exit 2, "missing required argument 'identifier'"
 *   $ bun src-next/cli.ts app install <unknown> -c <config>      -> exit 1, "... doesn't exist in Crowdin Store"
 *   $ bun src-next/cli.ts app list -c <config without project_id> -> exit 2, "Required option 'project_id' is missing"
 *
 * Note the `install`/`uninstall` actions' own `CliError('Application identifier can not be empty')`
 * guards are unreachable from the CLI: `builder.ts` declares the argument as `<identifier>`, so
 * commander rejects a missing one first (exit 2, its own wording). The guards are covered by
 * `tests/cli/commands/app/AppCommand.test.ts`, which calls the actions directly.
 */

/** An identifier no Crowdin Store listing and no installation will ever use. */
const UNKNOWN_IDENTIFIER = 'crowdin-cli-e2e-no-such-app-xyz';

/** The app the round trip installs and removes. See the header for why this one. */
const INSTALLABLE_IDENTIFIER = 'batch-add-strings';
const INSTALLABLE_NAME = 'Bulk Add Strings';

interface ListedApp {
  identifier: string;
  name: string;
}

describe('app', () => {
  let ctx: SuiteContext;

  /** Set once this run's install succeeds, so the safety net only removes what this run added. */
  let installedByThisRun = false;

  /** The account's current installations, read through the CLI's own machine contract. */
  async function listInstalled(): Promise<ListedApp[]> {
    const result = await ctx.runner.run(['app', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ListedApp[];
  }
  // Filled by the `--output json` test and read by the two format cross-checks below, so all three
  // compare against the same observed account state rather than against a hardcoded expectation.
  let listedApps: ListedApp[];

  beforeAll(async () => {
    // No project is created: `app`'s three subcommands are account-scoped and never send one.
    ctx = await setupSuite('app', { withoutProject: true });
  });

  afterAll(async () => {
    // Safety net for the account-scoped install: if a test between the install and the uninstall
    // failed, the app would otherwise outlive this run and the next one would find the account
    // dirty. Deleting an already-deleted installation just 404s, so this is safe to repeat, and it
    // honours CROWDIN_E2E_KEEP the way teardownSuite does. Gated on `installedByThisRun` so a
    // pre-existing installation someone else made is never removed on our way out.
    if (ctx && installedByThisRun && !ctx.env.keep) {
      try {
        await ctx.client.applicationsApi.deleteApplicationInstallation(INSTALLABLE_IDENTIFIER, true);
      } catch {
        // Already gone (the happy path, since the round trip uninstalls it itself).
      }
    }

    await teardownSuite(ctx);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['app']);

    expect(result.exitCode).toBe(0);
    // Not snapshotted: the help block also renders every global option, so it would churn on
    // changes that have nothing to do with this command.
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

    // `output.list` in a structured format serializes the view's `keys` and nothing else
    // (`cli/utils/output.ts`), so this is the machine contract for `app list`: an array of
    // {identifier, name}, empty when the account has no installations.
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
    // The plain view is `app.identifier` per line and the empty message is text-only, so an account
    // with no installations prints nothing at all here.
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

    // Text renders `<identifier> <name>` behind a success marker, one line per app.
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
    // `findManifestUrl` queries the store directly (developer.app.crowdin.net), not the Crowdin
    // API, so this path never touches the project or the token.
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

    // The API answers 404, which `mapCrowdinError` maps to NotFoundError -> exit 102. The message
    // is the API's own text ("Application Not Found") behind AppService's fallback prefix.
    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain(`Failed to uninstall application '${UNKNOWN_IDENTIFIER}'`);
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('installs an application from the Crowdin Store', async () => {
    // Precondition, asserted rather than assumed: a stale installation left by a crashed earlier
    // run would make the install below fail with an API error that says nothing about the cause.
    expect(await listInstalled()).not.toContainEqual({
      identifier: INSTALLABLE_IDENTIFIER,
      name: INSTALLABLE_NAME,
    });

    const result = await ctx.runner.run(['app', 'install', INSTALLABLE_IDENTIFIER]);

    installedByThisRun = result.exitCode === 0;

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Application has been installed');
    // `installAction` echoes the installed app through the same view `app list` uses, so text
    // renders `<identifier> <name>` after the success line.
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
    // No `--force`: `uninstallAction` passes `options.force ?? false`, and a freshly installed app
    // has nothing that would need forcing.
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

    // `CROWDIN_PROJECT_ID` has to be removed, not just left out of the config: `envFallbackLayer`
    // (cli/config.ts) reads it as the lowest config layer, and the repo-root `.env` sets it, so
    // locally the id would be supplied from the environment and this would exit 0. CI sets only
    // `CROWDIN_E2E_TOKEN`, so without this the two disagree.
    const result = await ctx.runner.run(['app', 'list'], { env: { CROWDIN_PROJECT_ID: undefined } });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Required option 'project_id' is missing");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });
});
