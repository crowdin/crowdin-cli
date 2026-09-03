import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `project list` / `project add` (`cli/commands/project/ProjectCommand.ts`).
 *
 * `project browse` is not covered: `browseAction` calls `openUrl`, which spawns a real
 * `open`/`xdg-open`, so a test would pop a browser tab on every run. Nothing in the command is
 * injectable - covering it needs an opener seam in `cli/utils/open.ts`. While it stays untested,
 * note `browseAction` discards `openUrl`'s boolean and claims success even where nothing opened.
 *
 * Both subcommands are account-scoped. `project list` returns every project the token manages, so
 * it is never snapshotted - assertions anchor on the suite's own project instead. `project add`
 * creates projects `teardownSuite` knows nothing about, so each id is recorded and removed in
 * `afterAll`.
 */

describe('project', () => {
  let ctx: SuiteContext;
  const createdProjectIds: number[] = [];

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
    expect(result.stdout).toMatch(
      new RegExp(`#${ctx.project.id} ${ctx.project.name} file-based private \\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z`),
    );
  });

  test('renders the text line for --output plain, which has no plain branch of its own', async () => {
    const result = await ctx.runner.run(['project', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    // `projectView` defines no `plain`, so `renderLine` falls back to `text` and the id keeps its
    // `#` - matching Java's ProjectListAction, which has no plain branch either.
    expect(result.stdout).toContain(`#${ctx.project.id} ${ctx.project.name}`);
  });

  test('serializes id and name only in a structured format', async () => {
    const [project] = await listedProjects();

    expect(Object.keys(project as object).sort()).toEqual(['id', 'name']);
  });

  test('requires a name to add', async () => {
    const result = await ctx.runner.run(['project', 'add']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'name'");
  });

  test('adds a project with target languages', async () => {
    const name = projectName('basic');
    const id = await addProject(name, ['-l', 'uk', '-l', 'it']);

    const created = await ctx.client.projectsGroupsApi.getProject(id);

    expect(created.data.name).toBe(name);
    expect(created.data.targetLanguageIds.sort()).toEqual(['it', 'uk']);
    expect(created.data.sourceLanguageId).toBe('en');

    expect(await listedProjects()).toContainEqual({ id, name });
  });

  test('prints the bare id with --output plain', async () => {
    const name = projectName('plain');
    const result = await ctx.runner.run(['project', 'add', name, '-l', 'uk', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    // `projectAddView` does define a plain branch, unlike the listing: the bare id.
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
    // Real behaviour, not intended: `--language` carries `required: true`, but `buildOption` never
    // reads that field, so nothing enforces it. Enforcing it should flip this test.
    const id = await addProject(projectName('nolang'), []);

    expect((await ctx.client.projectsGroupsApi.getProject(id)).data.targetLanguageIds).toEqual([]);
  });
});
