import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('full CLI project workflow', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('full-cli-workflow', { targetLanguageIds: ['it', 'uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('previews the source upload', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the source upload as a tree', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--dryrun', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the source upload as plain output', async () => {
    const result = await ctx.runner.run(['upload', 'sources', '--dryrun', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
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

  test('previews the translation upload', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation upload as a tree', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation upload as plain output', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--dryrun', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for every target language', async () => {
    const result = await ctx.runner.run(['upload', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads translations for a single language', async () => {
    const result = await ctx.runner.run(['upload', 'translations', '--language', 'uk']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download as a tree', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('previews the translation download as plain output', async () => {
    const result = await ctx.runner.run(['download', 'translations', '--dryrun', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations for every target language', async () => {
    // Download lands at the configured `translation:` pattern (translations/<lang>/<file>) here —
    // the same local path the upload-translations fixtures already occupy, so capture their content
    // before the download overwrites them, instead of comparing a file against itself afterwards.
    const uploadedContent = new Map<string, string>();
    for (const language of ['it', 'uk']) {
      for (const file of ['alpha.md', 'beta.md', 'gamma.md']) {
        const key = `${language}/${file}`;
        uploadedContent.set(key, await Bun.file(join(ctx.workspace, 'translations', language, file)).text());
      }
    }

    const result = await ctx.runner.run(['download', 'translations']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'translations/it/alpha.md',
      'translations/it/beta.md',
      'translations/it/gamma.md',
      'translations/uk/alpha.md',
      'translations/uk/beta.md',
      'translations/uk/gamma.md',
    );

    // The downloaded translation must match the content that was uploaded for that language.
    for (const language of ['it', 'uk']) {
      for (const file of ['alpha.md', 'beta.md', 'gamma.md']) {
        const downloaded = await Bun.file(join(ctx.workspace, 'translations', language, file)).text();
        expect(downloaded).toBe(uploadedContent.get(`${language}/${file}`));
      }
    }
  });

  test('downloads translations for a single language', async () => {
    await rm(join(ctx.workspace, 'translations', 'it'), { recursive: true, force: true });
    await rm(join(ctx.workspace, 'translations', 'uk'), { recursive: true, force: true });

    const result = await ctx.runner.run(['download', 'translations', '--language', 'uk']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(
      ctx.workspace,
      'translations/uk/alpha.md',
      'translations/uk/beta.md',
      'translations/uk/gamma.md',
    );
    expect(await Bun.file(join(ctx.workspace, 'translations/it/alpha.md')).exists()).toBe(false);
  });

  test('lists project source files', async () => {
    const result = await ctx.runner.run(['file', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sources/alpha.md');
    expect(result.stdout).toContain('sources/beta.md');
    expect(result.stdout).toContain('sources/gamma.md');
  });

  test('lists project source files as a tree', async () => {
    const result = await ctx.runner.run(['file', 'list', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured source files', async () => {
    const result = await ctx.runner.run(['config', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured source files as a tree', async () => {
    const result = await ctx.runner.run(['config', 'sources', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured translation files', async () => {
    const result = await ctx.runner.run(['config', 'translations']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists configured translation files as a tree', async () => {
    const result = await ctx.runner.run(['config', 'translations', '--tree']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists target languages', async () => {
    const result = await ctx.runner.run(['language', 'list']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads sources', async () => {
    const result = await ctx.runner.run(['download', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();

    await expectFilesExist(ctx.workspace, 'sources/alpha.md', 'sources/beta.md', 'sources/gamma.md');
  });

  test('validates a correct configuration file', async () => {
    const result = await ctx.runner.run(['config', 'lint']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports an invalid configuration file', async () => {
    const result = await ctx.runner.run([
      'config',
      'lint',
      '--source',
      'sources/does-not-exist-*.md',
      '--translation',
      'translations/%two_letters_code%/%original_file_name%',
    ]);

    expect(result.exitCode).toBe(2);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
