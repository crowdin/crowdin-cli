import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/**
 * The per-file `type:` config key reaching the
 * file-create API call.
 *
 * The API splits a file type into `type` (the base format) plus `parserVersion`, so the assertions below check both. A bare `type:
 * "android"` resolves to whatever parser version the backend currently defaults to.
 */
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
    await switchConfig(ctx, 'file-type', { type: 'android6' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 6 });
  });

  test('type "android8" is stored as android with parserVersion 8', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android8' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 8 });
  });

  test('type "android" is normalized to parserVersion 11', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 11 });
  });

  test('type "android5" is stored as android with parserVersion 5', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android5' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 5 });
  });

  test('type "android4" is stored as android with parserVersion 4', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android4' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 4 });
  });

  test('type "android3" is stored as android with parserVersion 3', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android3' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 3 });
  });

  test('type "android2" is stored as android with parserVersion 2', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android2' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 2 });
  });

  test('type "android1" is normalized to parserVersion 1', async () => {
    await deleteAllProjectFiles(ctx);
    await switchConfig(ctx, 'file-type', { type: 'android1' });

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await getUploadedFileType(ctx)).toEqual({ type: 'android', parserVersion: 1 });
  });
});
