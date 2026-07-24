import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Port of `CliFileTypeTest::testUploadSources` (crowdin-backend
 * tests/Cli/Common/CliFileTypeTest.php). Verifies the per-file `type:` config
 * key is threaded through to the file-create API call.
 *
 * The PHP suite this was ported from asserted on a single combined `type`
 * string (e.g. `android6`). Confirmed live (via direct API query against a
 * throwaway project, bypassing the CLI): the current API model has split that
 * into two separate fields - `type` is always the base format name
 * (`android`), and the version now lives in the separate `parserVersion`
 * field. So `type: "android6"` in crowdin.yml correctly produces
 * `type: "android"` + `parserVersion: 6` server-side; asserting the old
 * combined string against `type` alone is what was actually stale here, not
 * the CLI's request. Confirmed the same way: bare `type: "android"` resolves
 * to `parserVersion: 11` (not `10` - bumped by backend commit `775156eae46`,
 * CN-63478, 2026-02-16), and `android1` resolves to `parserVersion: 1`, same
 * as omitting a version entirely.
 *
 * `type` differs per test and `writeConfig`/`renderConfig` only substitute
 * `{{projectId}}`/`{{token}}` (and throw on any other `{{...}}`), so each test
 * writes a full `crowdin.yml` directly instead of going through that helper.
 */
async function writeConfigWithType(ctx: SuiteContext, fileType: string): Promise<void> {
  const yaml = [
    `project_id: "${ctx.project.id}"`,
    `api_token: "${ctx.env.token}"`,
    `base_path: "./files"`,
    `base_url: "https://api.crowdin.com"`,
    `preserve_hierarchy: true`,
    `files:`,
    `  - source: "/android.xml"`,
    `    translation: "/android%two_letters_code%.xml"`,
    `    type: "${fileType}"`,
  ].join('\n');
  await Bun.write(join(ctx.workspace, 'crowdin.yml'), yaml);
}

/** Equivalent of the PHP suite's `ProjectFilesHelper::deleteAllFiles()`. */
async function deleteAllProjectFiles(ctx: SuiteContext): Promise<void> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
  for (const file of files.data) {
    await ctx.client.sourceFilesApi.deleteFile(ctx.project.id, file.data.id);
  }
}

interface UploadedFileType {
  type: string | undefined;
  parserVersion: number | undefined;
}

/** Reads back the server-side `type` + `parserVersion` of the uploaded `android.xml`, if present. */
async function getUploadedFileType(ctx: SuiteContext): Promise<UploadedFileType> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id);
  const file = files.data.find((f) => f.data.name === 'android.xml')?.data;
  return { type: file?.type, parserVersion: file?.parserVersion };
}

describe('file type', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('file-type', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('type "android6" is stored as android with parserVersion 6', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android6');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 6 });
  });

  test('type "android8" is stored as android with parserVersion 8', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android8');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 8 });
  });

  test('type "android" is normalized to parserVersion 11', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 11 });
  });

  test('type "android5" is stored as android with parserVersion 5', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android5');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 5 });
  });

  test('type "android4" is stored as android with parserVersion 4', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android4');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 4 });
  });

  test('type "android3" is stored as android with parserVersion 3', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android3');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 3 });
  });

  test('type "android2" is stored as android with parserVersion 2', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android2');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 2 });
  });

  test('type "android1" is normalized to parserVersion 1', async () => {
    await deleteAllProjectFiles(ctx);
    await writeConfigWithType(ctx, 'android1');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 1 });
  });
});
