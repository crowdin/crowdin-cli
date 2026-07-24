import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('csv multilingual in root', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('csv-multilingual-in-root', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads multilingual CSV sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File '1_multilingual.csv'");
    expect(result.stdout).toContain("File '2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads the same sources to a new branch', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '-b', 'test-branch']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File '1_multilingual.csv'");
    expect(result.stdout).toContain("File '2_multilingual.csv'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
