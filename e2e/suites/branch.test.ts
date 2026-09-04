import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { createTestProject, deleteTestProject } from '../helpers/project.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers the `branch` command itself (`cli/commands/branch/BranchCommand.ts`). `branches.test.ts`
 * only exercises the `-b` flag of upload/download; nothing touched add/list/edit/clone/merge.
 *
 * The project is strings-based, because `clone` and `merge` refuse to run against any other type.
 * That also makes the merge assertable without a file round trip: `string add -b` puts strings on
 * the source branch, and the merge has to carry them into the target.
 */
/** A strings-based project is created with this branch already in it. */
const DEFAULT_BRANCH = 'main';
const MAIN_BRANCH = 'main-line';
const FEATURE_BRANCH = 'feature';
const RENAMED_BRANCH = 'feature-renamed';
const SLASHED_BRANCH = 'feature/login';
const NORMALIZED_BRANCH = 'feature.login';
const CLONE_TARGET = 'cloned';
const MERGE_SOURCE = 'to-merge';
const MERGED_STRING = 'String added on the merge source branch';

describe('branch', () => {
  let ctx: SuiteContext;
  let fileBasedProjectId: number;

  beforeAll(async () => {
    ctx = await setupSuite('branch', { stringsBased: true });
    // The strings-based guard needs a project of the other kind to fire against; the suite's own
    // project cannot be it.
    fileBasedProjectId = (await createTestProject(ctx.client, { suite: 'branch-file-based' })).id;
  });

  afterAll(async () => {
    if (ctx && fileBasedProjectId && !ctx.env.keep) {
      try {
        await deleteTestProject(ctx.client, fileBasedProjectId);
      } catch (error) {
        console.error(`Failed to delete project #${fileBasedProjectId}: ${error}`);
      }
    }

    await teardownSuite(ctx);
  });

  async function listBranchNames(projectId = ctx.project.id): Promise<string[]> {
    const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectBranches(projectId);

    return response.data.map((entry) => entry.data.name).sort();
  }

  async function findBranch(name: string, projectId = ctx.project.id) {
    const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectBranches(projectId, { name });
    const match = response.data.find((entry) => entry.data.name === name);

    if (!match) {
      throw new Error(`Branch '${name}' not found via the API`);
    }

    return match.data;
  }

  async function branchStringTexts(branchName: string): Promise<string[]> {
    const branch = await findBranch(branchName);
    const response = await ctx.client.sourceStringsApi
      .withFetchAll()
      .listProjectStrings(ctx.project.id, { branchId: branch.id });

    return response.data.map((entry) => entry.data.text as string).sort();
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage branches in a Crowdin project');

    for (const subcommand of ['list', 'add', 'delete', 'edit', 'clone', 'merge']) {
      expect(result.stdout).toContain(subcommand);
    }
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['branch', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  // A strings-based project is never branch-free: Crowdin creates 'main' with the project, so the
  // 'No branches found' empty state is out of reach here.
  test('lists the branch a new project starts with', async () => {
    const result = await ctx.runner.run(['branch', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(DEFAULT_BRANCH);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a branch name on add', async () => {
    const result = await ctx.runner.run(['branch', 'add']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'name'");
  });

  test('adds a branch', async () => {
    const result = await ctx.runner.run(['branch', 'add', MAIN_BRANCH]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(MAIN_BRANCH);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listBranchNames()).toEqual([DEFAULT_BRANCH, MAIN_BRANCH]);
  });

  test('warns instead of failing when the branch already exists', async () => {
    const result = await ctx.runner.run(['branch', 'add', MAIN_BRANCH]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(`Branch '${MAIN_BRANCH}' already exists in the project`);
    expect(await listBranchNames()).toEqual([DEFAULT_BRANCH, MAIN_BRANCH]);
  });

  test('adds a branch with a title', async () => {
    const result = await ctx.runner.run(['branch', 'add', FEATURE_BRANCH, '--title', 'Feature work']);

    expect(result.exitCode).toBe(0);
    expect((await findBranch(FEATURE_BRANCH)).title).toBe('Feature work');
  });

  // --priority and --export-pattern are file-based concepts: the API answers "Field 'priority' is
  // unexpected" for a strings-based project, so they are exercised against the other project.
  test('adds a branch with a priority and an export pattern in a file-based project', async () => {
    const result = await ctx.runner.run([
      'branch',
      'add',
      'prioritized',
      '--priority',
      'high',
      '--export-pattern',
      '/%two_letters_code%/%original_file_name%',
      '--project-id',
      String(fileBasedProjectId),
    ]);

    expect(result.exitCode).toBe(0);

    const branch = await findBranch('prioritized', fileBasedProjectId);

    expect(branch.priority).toBe('high');
    expect(branch.exportPattern).toBe('/%two_letters_code%/%original_file_name%');
  });

  test('edits the priority of a file-based project branch', async () => {
    const result = await ctx.runner.run([
      'branch',
      'edit',
      'prioritized',
      '--priority',
      'low',
      '--project-id',
      String(fileBasedProjectId),
    ]);

    expect(result.exitCode).toBe(0);
    expect((await findBranch('prioritized', fileBasedProjectId)).priority).toBe('low');
  });

  test('rejects an unsupported --priority value', async () => {
    const result = await ctx.runner.run(['branch', 'add', 'bad-priority', '--priority', 'urgent']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('urgent');
  });

  // Crowdin refuses the separators a VCS branch name is full of, so the CLI replaces them with dots
  // and keeps the name the user typed as the title (parsing.ts `normalizeBranchName`).
  test('normalizes a branch name and keeps the original as the title', async () => {
    const result = await ctx.runner.run(['branch', 'add', SLASHED_BRANCH]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(NORMALIZED_BRANCH);

    const branch = await findBranch(NORMALIZED_BRANCH);

    expect(branch.title).toBe(SLASHED_BRANCH);
  });

  test('lists every branch', async () => {
    const result = await ctx.runner.run(['branch', 'list']);

    expect(result.exitCode).toBe(0);

    for (const name of [DEFAULT_BRANCH, MAIN_BRANCH, FEATURE_BRANCH, NORMALIZED_BRANCH]) {
      expect(result.stdout).toContain(name);
    }
  });

  test('lists branch names only in the plain output', async () => {
    const result = await ctx.runner.run(['branch', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim().split('\n').sort()).toEqual(
      [DEFAULT_BRANCH, FEATURE_BRANCH, MAIN_BRANCH, NORMALIZED_BRANCH].sort(),
    );
  });

  test('lists branches as structured data', async () => {
    const result = await ctx.runner.run(['branch', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const branches = JSON.parse(result.stdout) as { id: number; name: string }[];

    expect(branches.map((branch) => branch.name).sort()).toEqual(
      [DEFAULT_BRANCH, FEATURE_BRANCH, MAIN_BRANCH, NORMALIZED_BRANCH].sort(),
    );
  });

  test('requires at least one parameter on edit', async () => {
    const result = await ctx.runner.run(['branch', 'edit', MAIN_BRANCH]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Specify some parameters to edit the branch');
  });

  test('fails to edit a branch that does not exist', async () => {
    const result = await ctx.runner.run(['branch', 'edit', 'no-such-branch', '--title', 'Nope']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'no-such-branch' branch");
  });

  test('renames a branch', async () => {
    const result = await ctx.runner.run(['branch', 'edit', FEATURE_BRANCH, '--name', RENAMED_BRANCH]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(RENAMED_BRANCH);
    expect(await listBranchNames()).toContain(RENAMED_BRANCH);
    expect(await listBranchNames()).not.toContain(FEATURE_BRANCH);
  });

  test('edits the title', async () => {
    const result = await ctx.runner.run(['branch', 'edit', RENAMED_BRANCH, '--title', 'Renamed feature']);

    expect(result.exitCode).toBe(0);
    expect((await findBranch(RENAMED_BRANCH)).title).toBe('Renamed feature');
  });

  test('clones a branch', async () => {
    const result = await ctx.runner.run(['branch', 'clone', MAIN_BRANCH, CLONE_TARGET]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(CLONE_TARGET);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listBranchNames()).toContain(CLONE_TARGET);
  });

  test('fails to clone a branch that does not exist', async () => {
    const result = await ctx.runner.run(['branch', 'clone', 'no-such-branch', 'whatever']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'no-such-branch' branch");
  });

  test('requires both names on merge', async () => {
    const result = await ctx.runner.run(['branch', 'merge', MAIN_BRANCH]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'target'");
  });

  test('merges a branch, carrying its strings into the target', async () => {
    const add = await ctx.runner.run(['branch', 'add', MERGE_SOURCE]);

    expect(add.exitCode).toBe(0);

    const addString = await ctx.runner.run(['string', 'add', MERGED_STRING, '-b', MERGE_SOURCE]);

    expect(addString.exitCode).toBe(0);

    const dryRun = await ctx.runner.run(['branch', 'merge', MERGE_SOURCE, MAIN_BRANCH, '--dryrun']);

    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.stdout).toContain(`Merged branch '${MERGE_SOURCE}' into '${MAIN_BRANCH}'`);
    expect(await branchStringTexts(MAIN_BRANCH)).toEqual([]);

    const result = await ctx.runner.run(['branch', 'merge', MERGE_SOURCE, MAIN_BRANCH]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Merge summary');
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await branchStringTexts(MAIN_BRANCH)).toEqual([MERGED_STRING]);
    expect(await listBranchNames()).toContain(MERGE_SOURCE);
  });

  test('deletes the source branch with --delete-after-merge', async () => {
    const result = await ctx.runner.run(['branch', 'merge', MERGE_SOURCE, MAIN_BRANCH, '--delete-after-merge']);

    expect(result.exitCode).toBe(0);
    expect(await listBranchNames()).not.toContain(MERGE_SOURCE);
  });

  test('warns instead of failing when deleting a branch that does not exist', async () => {
    const result = await ctx.runner.run(['branch', 'delete', 'no-such-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Branch 'no-such-branch' doesn't exist in the project");
  });

  test('deletes a branch', async () => {
    const result = await ctx.runner.run(['branch', 'delete', CLONE_TARGET]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Branch '${CLONE_TARGET}' deleted`);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await listBranchNames()).not.toContain(CLONE_TARGET);
  });

  test('refuses to clone in a file-based project', async () => {
    const result = await ctx.runner.run([
      'branch',
      'clone',
      MAIN_BRANCH,
      'whatever',
      '--project-id',
      String(fileBasedProjectId),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('This command is only available for string-based projects');
  });

  test('refuses to merge in a file-based project', async () => {
    const result = await ctx.runner.run([
      'branch',
      'merge',
      MAIN_BRANCH,
      'whatever',
      '--project-id',
      String(fileBasedProjectId),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('This command is only available for string-based projects');
  });
});
