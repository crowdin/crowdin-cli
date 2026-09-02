import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `label list` / `label add` / `label delete` (`cli/commands/label/LabelCommand.ts`). No PHP
 * original to port - written against the TS implementation.
 *
 * Labels are project-scoped, so `teardownSuite` cleans up everything this suite creates and no
 * account-level state is touched.
 *
 * Label ids are assigned by the server and are neither contiguous nor stable between runs (a probe
 * saw 15, 17, 23, 25 within one project), so nothing here asserts an id value: the json tests match
 * titles and merely require the id to be a number, and the text listings go through `normalize`,
 * which masks `#123` to `#id`. Ordering is the API's insertion order in every format; `normalize`
 * sorts both the `◆`-marked text lines and the bare `--output plain` lines, and the json tests sort
 * titles themselves.
 *
 * The last test covers the path labels are actually created by in practice:
 * `LabelService.resolveLabelIds` with `createMissing`, reached from `upload sources --label`, which
 * `label list` then has to show.
 *
 * Note `addAction`/`deleteAction`'s own `CliError('Label title is required')` guards are unreachable
 * from the CLI - `builder.ts` declares the argument as `<title>`, so commander rejects a missing one
 * first with its own wording and exit 2.
 */

interface ListedLabel {
  id: number;
  title: string;
}

describe('label', () => {
  let ctx: SuiteContext;

  /** The project's labels, read through the CLI's machine contract, sorted for comparison. */
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
    // Added out of alphabetical order on purpose: every listing below is sorted by `normalize` or by
    // the test, so an assertion that accidentally depended on insertion order would show up here.
    const result = await ctx.runner.run(['label', 'add', 'zebra-label']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('zebra-label');
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await listTitles()).toEqual(['zebra-label']);
  });

  test('warns instead of duplicating when the title already exists', async () => {
    const result = await ctx.runner.run(['label', 'add', 'zebra-label']);

    // `addAction` returns after the warning rather than throwing, so this is a success exit.
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
    // Java's LabelListAction prints the decorated line when `!plainView || isVerbose`, which
    // `labelVerboseView` reproduces by pointing `plain` at the text renderer.
    const result = await ctx.runner.run(['label', 'list', '--output', 'plain', '--verbose']);

    expect(result.exitCode).toBe(0);

    const lines = result.stdout.split('\n').filter((line) => line.length > 0);

    // Sorted by title, not by the whole line: the id comes first and server ids are unordered
    // relative to the titles, so `#27 zebra-label` sorts before `#29 alpha-label`.
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
    // The path labels are really created by: `LabelService.resolveLabelIds` adds any title the
    // project doesn't have yet (createMissing defaults to true), so the upload is what brings
    // 'from-upload' into existence.
    const upload = await ctx.runner.run(['upload', 'sources', '--label', 'from-upload']);

    expect(upload.exitCode).toBe(0);
    expect(upload.stdout).toContain("File 'sources/1_android.xml'");

    expect(await listTitles()).toEqual(['alpha-label', 'from-upload']);
  });
});
