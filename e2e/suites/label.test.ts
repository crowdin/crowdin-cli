import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `label list` / `label add` / `label delete` (`cli/commands/label/LabelCommand.ts`).
 *
 * Server label ids are neither contiguous nor stable between runs, so nothing asserts one: json
 * matches titles, and the text listings go through `normalize`, which masks `#123` to `#id`.
 *
 * The last test covers how labels are really created - `LabelService.resolveLabelIds` with
 * `createMissing`, reached from `upload sources --label`.
 */

interface ListedLabel {
  id: number;
  title: string;
}

describe('label', () => {
  let ctx: SuiteContext;

  async function listTitles(): Promise<string[]> {
    const result = await ctx.runner.run(['label', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return (JSON.parse(result.stdout) as ListedLabel[]).map((label) => label.title).sort();
  }

  beforeAll(async () => {
    ctx = await setupSuite('label', { targetLanguageIds: ['uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['label']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage labels');
    expect(result.stdout).toContain('add <title>');
    expect(result.stdout).toContain('delete <title>');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['label', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports an empty project', async () => {
    const result = await ctx.runner.run(['label', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No labels found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a title to add', async () => {
    const result = await ctx.runner.run(['label', 'add']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'title'");
  });

  test('requires a title to delete', async () => {
    const result = await ctx.runner.run(['label', 'delete']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'title'");
  });

  test('adds a label and echoes it back', async () => {
    // Out of alphabetical order on purpose, so a listing that depends on insertion order fails.
    const result = await ctx.runner.run(['label', 'add', 'zebra-label']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('zebra-label');
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listTitles()).toEqual(['zebra-label']);
  });

  test('warns instead of duplicating when the title already exists', async () => {
    const result = await ctx.runner.run(['label', 'add', 'zebra-label']);

    // `addAction` returns after warning rather than throwing, hence the success exit.
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Label 'zebra-label' already exists in the project");
    expect(await listTitles()).toEqual(['zebra-label']);
  });

  test('adds a second label', async () => {
    const result = await ctx.runner.run(['label', 'add', 'alpha-label']);

    expect(result.exitCode).toBe(0);
    expect(await listTitles()).toEqual(['alpha-label', 'zebra-label']);
  });

  test('lists both labels with their ids', async () => {
    const result = await ctx.runner.run(['label', 'list']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists the titles alone with --output plain', async () => {
    const result = await ctx.runner.run(['label', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(
      result.stdout
        .split('\n')
        .filter((line) => line.length > 0)
        .sort(),
    ).toEqual(['alpha-label', 'zebra-label']);
  });

  test('carries the ids into a verbose plain listing', async () => {
    // `labelVerboseView` points `plain` at the text renderer, as Java's LabelListAction does.
    const result = await ctx.runner.run(['label', 'list', '--output', 'plain', '--verbose']);

    expect(result.exitCode).toBe(0);

    const lines = result.stdout.split('\n').filter((line) => line.length > 0);

    // Sorted by title, not whole line: the id comes first, so `#27 zebra` sorts before `#29 alpha`.
    expect(lines.map((line) => line.replace(/^#\d+ /, '')).sort()).toEqual(['alpha-label', 'zebra-label']);

    for (const line of lines) {
      expect(line).toMatch(/^#\d+ \S+$/);
    }
  });

  test('serializes id and title in a structured format', async () => {
    const result = await ctx.runner.run(['label', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const labels = (JSON.parse(result.stdout) as ListedLabel[]).sort((left, right) =>
      left.title < right.title ? -1 : 1,
    );

    expect(labels).toEqual([
      { id: expect.any(Number), title: 'alpha-label' },
      { id: expect.any(Number), title: 'zebra-label' },
    ]);
  });

  test('rejects deleting a title the project does not have', async () => {
    const result = await ctx.runner.run(['label', 'delete', 'nope']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Couldn't find label by the specified title");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('deletes a label by title', async () => {
    const result = await ctx.runner.run(['label', 'delete', 'zebra-label']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Label 'zebra-label' deleted successfully");
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listTitles()).toEqual(['alpha-label']);
  });

  test('shows a label created on the fly by `upload sources --label`', async () => {
    // resolveLabelIds creates any title the project lacks, so the upload mints 'from-upload'.
    const upload = await ctx.runner.run(['upload', 'sources', '--label', 'from-upload']);

    expect(upload.exitCode).toBe(0);
    expect(upload.stdout).toContain("File 'sources/1_android.xml'");

    expect(await listTitles()).toEqual(['alpha-label', 'from-upload']);
  });
});
