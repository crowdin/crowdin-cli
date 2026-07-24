import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates
 * (copied into the workspace verbatim since only fixtures' top-level `config/` dir is rendered by
 * `setupSuite`). Used both for the mid-suite switch to `crowdin-v2` (different translation
 * destination) and to switch back to the original config before the branch tests.
 */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

/**
 * `download translations` writes to the exact local path the `upload translations` fixtures
 * already occupy (`translations/<lang>/<file>`), and a stale file left over from an earlier
 * upload/download in this suite could masquerade as a successful download. Clear it first.
 */
async function clearDownloadedTranslations(ctx: SuiteContext): Promise<void> {
  await rm(join(ctx.workspace, 'translations'), { recursive: true, force: true });
}

describe('csv multilingual placeholder', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('csv-multilingual-placeholder', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads multilingual CSV sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for a single language via --language', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--language', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).not.toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).not.toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download (dryrun)', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('translations/it/1_multilingual.csv');
    expect(result.stdout).toContain('translations/it/2_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/1_multilingual.csv');
    expect(result.stdout).toContain('translations/uk/2_multilingual.csv');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations and matches the merged multilingual content', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/it/2_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/uk/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/uk/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_multilingual.csv')).text(),
    );
  });

  test('updates sources from a new base path, targeting a new translation destination', async () => {
    await switchConfig(ctx, 'crowdin-v2');
    const result = await ctx.runner.run(['upload', 'sources', '--base-path', 'rev2']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations at the new translations-v2 destination', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations-v2/it/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations-v2/it/2_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations-v2/uk/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations-v2/uk/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a new branch', async () => {
    await switchConfig(ctx, 'crowdin-original');
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory sources created');
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Known bug (crowdin-cli-known-bugs.md, Bug 4): the existing-file lookup for a branched upload
  // ignores the branch-name prefix Crowdin includes in `file.data.path`, so a second upload to an
  // existing branch always takes the "create" path instead of "update" and the server rejects the
  // duplicate create. Reproduces the same way as base-path.test.ts's
  // 'updates sources on the branch (branch already exists)'. Left as an honest red test that
  // asserts the CORRECT behavior — do not weaken these assertions to match the buggy output.
  test('updates sources on the branch (branch already exists)', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'sources/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Cascades from the same Bug 4 root cause: translation upload resolves the source file by a
  // branch-agnostic path too, so it can't find the branch-scoped source file either. Left red for
  // the same reason as the test above.
  test('uploads translations on the branch', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Importing translations for file 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("Importing translations for file 'translations/uk/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/it/2_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/1_multilingual.csv'");
    expect(result.stdout).toContain("File 'translations/uk/2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Depends on the two branch upload tests above actually having pushed content server-side;
  // may fail as a further cascade of Bug 4 rather than a new, independent issue.
  test('downloads translations on the branch', async () => {
    await clearDownloadedTranslations(ctx);

    const result = await ctx.runner.run(['download', 'translations', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File translations/it/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/it/2_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/uk/1_multilingual.csv extracted');
    expect(result.stdout).toContain('File translations/uk/2_multilingual.csv extracted');
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, 'translations/it/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/it/2_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/1_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/1_multilingual.csv')).text(),
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/uk/2_multilingual.csv')).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/uk/2_multilingual.csv')).text(),
    );
  });
});
