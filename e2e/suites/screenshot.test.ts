import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `screenshot list` / `screenshot upload` / `screenshot delete`
 * (`cli/commands/screenshot/ScreenshotCommand.ts`).
 *
 * The image fixtures are real 32x32 PNGs because `upload` streams the file to storage and the API
 * rejects anything undecodable. `images/not-an-image.txt` exists to reach the extension check; the
 * directory check is reached by passing `images` itself.
 *
 * `--auto-tag` runs but tags nothing: flat-colour fixtures match no string, so `tagsCount` stays 0.
 * The round trip is the subject, not the OCR result.
 *
 * `--label` is resolved two different ways: `upload` uses `resolveLabelIds` with the default
 * `createMissing`, so the label is created and attached; `list` uses the command's own
 * `resolveFilterLabelIds`, where an unknown title is an error because filtering must not create.
 */

const LABEL = 'shot-label';

interface ListedScreenshot {
  id: number;
  tagsCount: number;
  name: string;
}

describe('screenshot', () => {
  let ctx: SuiteContext;
  let screenshotId: number;

  async function listScreenshots(args: string[] = []): Promise<ListedScreenshot[]> {
    const result = await ctx.runner.run(['screenshot', 'list', ...args, '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ListedScreenshot[];
  }

  beforeAll(async () => {
    ctx = await setupSuite('screenshot', { targetLanguageIds: ['uk'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads the source file that --auto-tag targeting needs', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['screenshot']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage screenshots');
    expect(result.stdout).toContain('upload <file>');
    expect(result.stdout).toContain('delete <id>');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['screenshot', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports a project with no screenshots', async () => {
    const result = await ctx.runner.run(['screenshot', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No screenshot found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a file path', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'file'");
  });

  test('rejects a path that does not exist locally', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload', 'images/missing.png']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("File 'images/missing.png' not found in the Crowdin project");
  });

  test('rejects a directory', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload', 'images']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The specified file is a directory');
  });

  test('rejects a file that is not an allowed image format', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload', 'images/not-an-image.txt']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Wrong format of the file. Supported formats: jpeg, jpg, png, gif');
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('requires --auto-tag alongside a targeting option', async () => {
    const result = await ctx.runner.run([
      'screenshot',
      'upload',
      'images/screenshot.png',
      '--file',
      'sources/1_android.xml',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--auto-tag' is required for '--file' option");
  });

  test('rejects more than one targeting option at a time', async () => {
    const result = await ctx.runner.run([
      'screenshot',
      'upload',
      'images/screenshot.png',
      '--auto-tag',
      '--file',
      'sources/1_android.xml',
      '--branch',
      'some-branch',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "Only one of the following options can be used at a time: '--file', '--branch' or '--directory'",
    );
  });

  test('uploads a screenshot and attaches a label', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload', 'images/screenshot.png', '--label', LABEL]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('screenshot.png');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const [screenshot] = await listScreenshots();

    expect(screenshot).toMatchObject({ name: 'screenshot.png', tagsCount: 0 });
    screenshotId = (screenshot as ListedScreenshot).id;
  });

  test('updates in place when the name already exists', async () => {
    const result = await ctx.runner.run(['screenshot', 'upload', 'images/screenshot.png']);

    expect(result.exitCode).toBe(0);

    const screenshots = await listScreenshots();

    // Same id, still one screenshot: the update branch ran, not the create branch.
    expect(screenshots).toHaveLength(1);
    expect(screenshots[0]?.id).toBe(screenshotId);
  });

  test('uploads a second screenshot with --auto-tag against a file', async () => {
    const result = await ctx.runner.run([
      'screenshot',
      'upload',
      'images/second.png',
      '--auto-tag',
      '--file',
      'sources/1_android.xml',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('second.png');
    expect(await listScreenshots()).toHaveLength(2);
  });

  test('lists both screenshots with id and tag count', async () => {
    const result = await ctx.runner.run(['screenshot', 'list']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists a bare id and name with --output plain', async () => {
    const result = await ctx.runner.run(['screenshot', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    const lines = result.stdout.split('\n').filter((line) => line.length > 0);

    expect(lines.map((line) => line.replace(/^\d+ /, '')).sort()).toEqual(['screenshot.png', 'second.png']);

    for (const line of lines) {
      expect(line).toMatch(/^\d+ \S/);
    }
  });

  test('serializes id, tag count and name in a structured format', async () => {
    const screenshots = (await listScreenshots()).sort((left, right) => (left.name < right.name ? -1 : 1));

    expect(screenshots).toEqual([
      { id: expect.any(Number), tagsCount: 0, name: 'screenshot.png' },
      { id: expect.any(Number), tagsCount: 0, name: 'second.png' },
    ]);
  });

  test('filters by name with --search', async () => {
    const screenshots = await listScreenshots(['--search', 'second']);

    expect(screenshots.map((screenshot) => screenshot.name)).toEqual(['second.png']);
  });

  test('filters by label, and by its absence', async () => {
    // Only the first upload carried --label, so the filters partition the set.
    expect((await listScreenshots(['--label', LABEL])).map((screenshot) => screenshot.name)).toEqual([
      'screenshot.png',
    ]);
    expect((await listScreenshots(['--exclude-label', LABEL])).map((screenshot) => screenshot.name)).toEqual([
      'second.png',
    ]);
  });

  test('rejects a label the project does not have', async () => {
    const result = await ctx.runner.run(['screenshot', 'list', '--label', 'no-such-label']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'no-such-label' label");
  });

  test('rejects a non-numeric --string-id', async () => {
    const result = await ctx.runner.run(['screenshot', 'list', '--string-id', 'abc']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("The '--string-id' value must be numeric");
  });

  test('rejects a non-numeric id to delete', async () => {
    const result = await ctx.runner.run(['screenshot', 'delete', 'abc']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Screenshot id must be numeric');
  });

  test('warns instead of failing when the id is unknown', async () => {
    const result = await ctx.runner.run(['screenshot', 'delete', '999999']);

    // deleteAction warns and returns rather than throwing, unlike `label delete`.
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Couldn't find screenshot by the specified ID");
  });

  test('deletes a screenshot by id', async () => {
    const result = await ctx.runner.run(['screenshot', 'delete', String(screenshotId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('screenshot.png');
    expect(result.stdout).toContain('deleted successfully');

    expect((await listScreenshots()).map((screenshot) => screenshot.name)).toEqual(['second.png']);
  });
});
