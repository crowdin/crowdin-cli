import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates.
 * Used for the two PHP `prepareConfig($ymlConfig, self::file('config/crowdin_revN.yml'))` steps
 * that switch to a config with a different `dest` mapping, not just a different `{$basePath}`.
 */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

/** Strips a leading slash so paths compare equal regardless of which form the API returns. */
function stripLeadingSlash(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

/** Remote project file paths, for asserting what delete-obsolete actually did/didn't remove. */
async function projectFilePaths(ctx: SuiteContext): Promise<string[]> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
  return files.data.map((file) => stripLeadingSlash(file.data.path)).sort();
}

/** Remote project directory paths. */
async function projectDirectoryPaths(ctx: SuiteContext): Promise<string[]> {
  const directories = await ctx.client.sourceFilesApi.listProjectDirectories(ctx.project.id);
  return directories.data.map((directory) => stripLeadingSlash(directory.data.path)).sort();
}

describe('delete obsolete', () => {
  let ctx: SuiteContext;

  // PHP's `{$basePath}` placeholder is re-rendered per test step to point at a different fixture
  // revision (sources/, sources_rev2/, ...). `renderConfig` only supports `{{projectId}}`/`{{token}}`,
  // so instead of templating `base_path` we keep it fixed at "." in the fixture and drive the
  // revision switch as a CLI flag (`--base-path <subdir>`) on every run - this resolves against the
  // workspace root (where crowdin.yml lives), exactly matching what PHP's placeholder swap achieved.
  // The two steps that also change the file-pattern `dest` (rev4, rev5) additionally swap the whole
  // config via `switchConfig`, mirroring PHP's `prepareConfig($ymlConfig, self::file('config/crowdin_revN.yml'))`.
  beforeAll(async () => {
    ctx = await setupSuite('delete-obsolete', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads all sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory destination created');
    expect(result.stdout).toContain('Directory lang created');
    expect(result.stdout).toContain("File '1_android.xml'");
    expect(result.stdout).toContain("File '2_android.xml'");
    expect(result.stdout).toContain("File '3_android.xml'");
    expect(result.stdout).toContain("File 'destination/1_simple.csv'");
    expect(result.stdout).toContain("File 'lang/4_android.xml'");
    expect(result.stdout).toContain("File 'lang/en-US.json'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await projectFilePaths(ctx)).toEqual(
      [
        '1_android.xml',
        '2_android.xml',
        '3_android.xml',
        'destination/1_simple.csv',
        'lang/4_android.xml',
        'lang/en-US.json',
      ].sort(),
    );
  });

  test('deletes nothing for real with --delete-obsolete --dryrun', async () => {
    const beforeFiles = await projectFilePaths(ctx);

    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--base-path',
      'sources_rev2',
      '--delete-obsolete',
      '--dryrun',
    ]);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // sources_rev2/ drops 2_android.xml and 1_simple.csv - a real run would delete their remote
    // counterparts, but --dryrun must leave the project untouched.
    expect(await projectFilePaths(ctx)).toEqual(beforeFiles);
  });

  test('deletes obsolete files and directories for real with --delete-obsolete', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources_rev3', '--delete-obsolete']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // sources_rev3/ only keeps 1_android.xml and 1_simple.csv - everything else that was still
    // present on the server (because the previous step was a dry run) must be gone for real now,
    // including the now-empty 'lang' directory.
    expect(await projectFilePaths(ctx)).toEqual(['1_android.xml', 'destination/1_simple.csv'].sort());
    expect(await projectDirectoryPaths(ctx)).not.toContain('lang');
  });

  test('deletes an obsolete file whose remaining sibling now has a dest', async () => {
    await switchConfig(ctx, 'crowdin-rev4');

    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources_rev4', '--delete-obsolete']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // sources_rev4/ has only 1_android.xml, and the new config remaps every file under
    // 'destination/' - 1_simple.csv (with no local counterpart anymore) becomes obsolete.
    const paths = await projectFilePaths(ctx);
    expect(paths).not.toContain('destination/1_simple.csv');
  });

  test('nothing to delete when the dest remap makes local and remote paths coincide (dryrun)', async () => {
    await switchConfig(ctx, 'crowdin-rev5');
    await ctx.runner.run(['upload', 'sources', '--base-path', 'sources_rev5']);
    const beforeFiles = await projectFilePaths(ctx);

    const result = await ctx.runner.run([
      'upload',
      'sources',
      '--base-path',
      'sources_rev5',
      '--delete-obsolete',
      '--dryrun',
    ]);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // sources_rev5/ (1_android.xml, 2_android.xml) already matches the current dest mapping
    // 1:1, so there is nothing obsolete to report even in a real run - a dry run must be a no-op.
    expect(await projectFilePaths(ctx)).toEqual(beforeFiles);
  });

  test('reports the steady state once local and remote paths already coincide', async () => {
    await ctx.runner.run(['upload', 'sources', '--base-path', 'sources_rev5']);
    const beforeFiles = await projectFilePaths(ctx);

    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'sources_rev5', '--delete-obsolete']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    // No obsolete files/directories remain at this point - a real --delete-obsolete run changes
    // nothing on the server, matching PHP's "No obsolete files/directories were found" steady state.
    expect(await projectFilePaths(ctx)).toEqual(beforeFiles);
  });
});
