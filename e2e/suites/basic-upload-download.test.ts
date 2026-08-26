import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('basic upload sources and download translations', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('basic-upload-download', { targetLanguageIds: ['uk', 'it'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads all source files to a fresh project', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates existing source files', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for every target language', async () => {
    const result = await ctx.runner.run(['download', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'it/sources/alpha.md',
      'it/sources/beta.md',
      'it/sources/gamma.md',
      'uk/sources/alpha.md',
      'uk/sources/beta.md',
      'uk/sources/gamma.md',
    );
  });
});
