import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Written into a source file only after that file exists server-side; must never be uploaded. */
const LOCAL_ONLY_STRING = 'local edit that --no-auto-update must not upload';

describe('auto update', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('auto-update');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources, creating both files', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates existing sources and creates a new one (auto-update is the default)', async () => {
    await copyFile(join(ctx.workspace, 'sources_rev2/1_android.xml'), join(ctx.workspace, 'sources/1_android.xml'));
    await copyFile(join(ctx.workspace, 'sources_rev2/2_android.xml'), join(ctx.workspace, 'sources/2_android.xml'));
    await copyFile(join(ctx.workspace, 'sources_rev2/3_android.xml'), join(ctx.workspace, 'sources/3_android.xml'));

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // The success line above is identical on the create and the update path, so stdout alone can't
    // tell an auto-update from a silent skip. Read the strings back instead: rev2 of 1_android.xml
    // rewrites every value and adds a sixth string, none of which can be present unless the existing
    // file was really updated.
    const texts = await projectStringTexts(ctx);

    expect(texts).toContain('sixth string source revision2 file1');
    expect(texts).toContain('first string source revision2 file1');
    expect(texts).not.toContain('first string source file1');
  });

  test('skips existing sources but still creates a new one with --no-auto-update', async () => {
    await copyFile(join(ctx.workspace, 'sources_rev2/4_android.xml'), join(ctx.workspace, 'sources/4_android.xml'));
    // 1_android.xml is already at rev2 both locally and server-side, so skipping and updating would
    // leave identical content and a state check couldn't tell them apart. Give it a local-only string
    // first: the skip is real only if this never reaches the project.
    await Bun.write(
      join(ctx.workspace, 'sources/1_android.xml'),
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
        `    <string name="str1">${LOCAL_ONLY_STRING}</string>\n</resources>\n`,
    );

    const result = await ctx.runner.run(['upload', 'sources', '--no-auto-update']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sources/1_android.xml already exists and will not be updated');
    expect(result.stdout).toContain('File sources/2_android.xml already exists and will not be updated');
    expect(result.stdout).toContain('File sources/3_android.xml already exists and will not be updated');
    expect(result.stdout).toContain("File 'sources/4_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    const texts = await projectStringTexts(ctx);

    expect(texts).not.toContain(LOCAL_ONLY_STRING);
    // The skipped file keeps the rev2 content test 2 uploaded, and the new file is still created.
    expect(texts).toContain('sixth string source revision2 file1');
    expect(texts).toContain('first string');
  });

  /** Every source string text in the project, read via the API rather than inferred from CLI output. */
  async function projectStringTexts(ctx: SuiteContext): Promise<(string | undefined)[]> {
    const response = await ctx.client.sourceStringsApi.withFetchAll().listProjectStrings(ctx.project.id, {});
    return response.data.map((entry) => ('text' in entry.data ? (entry.data.text as string) : undefined));
  }
});
