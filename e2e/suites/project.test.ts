import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `project list` / `project add` (`cli/commands/project/ProjectCommand.ts`). No PHP original
 * - written against the TS implementation.
 *
 * `project browse` is NOT covered, deliberately. `browseAction` calls `openUrl`, which
 * `Bun.spawn`s `open` (macOS) or `xdg-open` (Linux), so a test would pop a real browser tab on the
 * machine running the suite - once per run, at every developer's desk. Nothing in the command is
 * injectable, so there is no way to exercise it without that side effect; testing it would need an
 * opener seam in `cli/utils/open.ts`. Worth knowing while it stays untested: `browseAction` ignores
 * `openUrl`'s boolean return, so it prints "Opened <url> in browser" even where the opener is
 * missing (a headless CI box with no `xdg-open`) and nothing actually opened.
 *
 * Everything `project` touches is ACCOUNT-scoped, which shapes the suite twice:
 *
 *   - `project list` reads every project the token manages, which is shared, long-lived state no
 *     test controls (this account carries six unrelated projects). Nothing here snapshots it.
 *     Instead the assertions are anchored on the suite's own project, which `setupSuite` created and
 *     whose id is known, and the output formats are cross-checked against each other.
 *   - `project add` creates real projects that `teardownSuite` knows nothing about, so each is
 *     recorded as it is created and deleted in `afterAll`. Only ids this run created are ever
 *     deleted.
 *
 * `--language` is declared `required: true` in `cli/commands/project/options.ts`, but `buildOption`
 * (`cli/builder.ts`) never reads that field - it handles short/type/variadic/default/choices/hidden
 * and nothing else - so the flag is not enforced. The test at the bottom records what actually
 * happens: the project is created with an empty target-language list, exit 0.
 */

describe('project', () => {
  let ctx: SuiteContext;
  /** Ids created by `project add` in this run, deleted in afterAll. Never anything else. */
  const createdProjectIds: number[] = [];

  /** A per-run, self-identifying name; `normalize` masks the `e2e-<digits>-` prefix if it is ever snapshotted. */
  const projectName = (suffix: string) => `e2e-${Math.floor(Date.now() / 1000)}-project-${suffix}`;

  async function addProject(name: string, args: string[]): Promise<number> {
    const result = await ctx.runner.run(['project', 'add', name, ...args]);

    expect(result.exitCode).toBe(0);

    const id = Number(result.stdout.match(/#(\d+)/)?.[1]);

    expect(Number.isInteger(id)).toBe(true);
    createdProjectIds.push(id);

    return id;
  }

  async function listedProjects(args: string[] = []): Promise<Array<{ id: number; name: string }>> {
    const result = await ctx.runner.run(['project', 'list', ...args, '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as Array<{ id: number; name: string }>;
  }

  beforeAll(async () => {
    ctx = await setupSuite('project');
  });

  afterAll(async () => {
    // `project add` is account-scoped, so teardownSuite's project deletion would leave these behind.
    // Honours CROWDIN_E2E_KEEP the way teardownSuite does, and only touches ids this run recorded.
    if (ctx && !ctx.env.keep) {
      for (const id of createdProjectIds) {
        try {
          await ctx.client.projectsGroupsApi.deleteProject(id);
        } catch (error) {
          console.error(`Failed to delete project #${id}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }

    await teardownSuite(ctx);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['project']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage projects');
    expect(result.stdout).toContain('add <name>');
    expect(result.stdout).toContain('browse');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['project', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test("lists the projects the token manages, including this suite's own", async () => {
    const projects = await listedProjects();

    // Anchored on the known project rather than the whole list: the account carries unrelated
    // long-lived projects, so any assertion about the full set would be about the account, not the
    // command.
    expect(projects).toContainEqual({ id: ctx.project.id, name: ctx.project.name });
  });

  test('renders id and name in the default text format', async () => {
    const result = await ctx.runner.run(['project', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`#${ctx.project.id} ${ctx.project.name}`);
  });

  test('adds type, visibility and last activity with --verbose', async () => {
    const result = await ctx.runner.run(['project', 'list', '--verbose']);

    expect(result.exitCode).toBe(0);
    // A fresh file-based project created by setupSuite, with an ISO timestamp for last activity.
    expect(result.stdout).toMatch(
      new RegExp(`#${ctx.project.id} ${ctx.project.name} file-based private \\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z`),
    );
  });

  test('renders the text line for --output plain, which has no plain branch of its own', async () => {
    const result = await ctx.runner.run(['project', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    // Deliberate: `projectView` defines no `plain`, and `renderLine` falls back to `text`, mirroring
    // Java's ProjectListAction, which has no plain branch either. So the id keeps its `#`.
    expect(result.stdout).toContain(`#${ctx.project.id} ${ctx.project.name}`);
  });

  test('serializes id and name only in a structured format', async () => {
    const [project] = await listedProjects();

    expect(Object.keys(project as object).sort()).toEqual(['id', 'name']);
  });

  test('requires a name to add', async () => {
    const result = await ctx.runner.run(['project', 'add']);

    // Commander rejects the missing `<name>` before addAction's own 'Project name is required'
    // guard, so that guard is unreachable from the CLI.
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'name'");
  });

  test('adds a project with target languages', async () => {
    const name = projectName('basic');
    const id = await addProject(name, ['-l', 'uk', '-l', 'it']);

    const created = await ctx.client.projectsGroupsApi.getProject(id);

    expect(created.data.name).toBe(name);
    expect(created.data.targetLanguageIds.sort()).toEqual(['it', 'uk']);
    // Not passed, so the documented default applies.
    expect(created.data.sourceLanguageId).toBe('en');

    expect(await listedProjects()).toContainEqual({ id, name });
  });

  test('prints the bare id with --output plain', async () => {
    const name = projectName('plain');
    const result = await ctx.runner.run(['project', 'add', name, '-l', 'uk', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    // `projectAddView` DOES define a plain branch, unlike the listing: Java's ProjectAddAction
    // prints the bare id, the one field a script needs from a project it just created.
    const id = Number(result.stdout.trim());

    expect(Number.isInteger(id)).toBe(true);
    createdProjectIds.push(id);
    expect(result.stdout.trim()).toBe(String(id));
  });

  test('adds a string-based project', async () => {
    const id = await addProject(projectName('sb'), ['-l', 'uk', '--string-based']);
    const created = await ctx.client.projectsGroupsApi.getProject(id);

    expect(created.data.type).toBe(ProjectsGroupsModel.Type.STRINGS_BASED);
  });

  test('adds a public project, private being the default', async () => {
    const publicId = await addProject(projectName('public'), ['-l', 'uk', '--public']);
    const privateId = await addProject(projectName('private'), ['-l', 'uk']);

    expect((await ctx.client.projectsGroupsApi.getProject(publicId)).data.visibility).toBe('open');
    expect((await ctx.client.projectsGroupsApi.getProject(privateId)).data.visibility).toBe('private');
  });

  test('honours --source-language', async () => {
    const id = await addProject(projectName('srclang'), ['-l', 'uk', '--source-language', 'de']);

    expect((await ctx.client.projectsGroupsApi.getProject(id)).data.sourceLanguageId).toBe('de');
  });

  test('creates a project with no target languages when --language is omitted', async () => {
    // Records real behaviour, not intended behaviour: `--language` carries `required: true`, but
    // `buildOption` never reads that field, so nothing enforces it and the project is created with
    // an empty target-language list. See this file's header.
    const id = await addProject(projectName('nolang'), []);

    expect((await ctx.client.projectsGroupsApi.getProject(id)).data.targetLanguageIds).toEqual([]);
  });
});
