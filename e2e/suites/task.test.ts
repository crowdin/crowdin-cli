import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `task list` / `task add` (`cli/commands/task/TaskCommand.ts`). No PHP original - written
 * against the TS implementation.
 *
 * This runs against crowdin.com, so `apiClient.organization` is falsy and `addAction` takes its
 * non-Enterprise branch: `--type` is required and validated against translate/proofread, and
 * `--workflow-step` (the Enterprise requirement) never applies. The Enterprise branch is therefore
 * NOT exercised here - `e2e/helpers/project.ts` builds a plain crowdin.com client and the harness
 * has no notion of an organization, the same limit `invalid-credentials.test.ts` records.
 *
 * What the server demands, learned by probing, because it dictates the whole fixture and the order
 * of the tests below:
 *
 *   - a `translate` task needs UNtranslated words in the target language, and
 *   - a `proofread` task needs translated-but-unapproved words.
 *
 * So the fixture ships Italian translations for both files and no Ukrainian ones: `it` has material
 * to proofread, `uk` has material to translate. Each created task also targets a distinct
 * file/language pair, because a second task over the same strings finds nothing left to cover and
 * the API rejects it ("Language has no untranslated words").
 *
 * `--label` filters a task to strings carrying that label, so the sources are uploaded with
 * `--label task-label` attached - without labelled strings a label-filtered task covers nothing and
 * is rejected for the same reason. Note this is `resolveLabelIds(titles, false)`: unlike
 * `upload sources --label`, an unknown title here is an error rather than a new empty label, which
 * is the counterpart to the createMissing path `label.test.ts` covers.
 *
 * Note `task`'s `--file` has NO short flag, unlike the `-f` that `status` declares for its own
 * `--file` (`cli/commands/task/options.ts` vs `cli/commands/status/options.ts`) - `-f` here is
 * "unknown option '-f'", exit 2.
 *
 * Task ids are server-assigned and unstable between runs, so the text listings rely on `normalize`
 * masking `#123` to `#id`. The `--output plain` view renders a BARE id (`11 Translate file one`,
 * no `#`), which `normalize` does not mask - that listing is asserted with the id stripped instead
 * of snapshotted.
 */

const LABEL = 'task-label';

interface ListedTask {
  id: number;
  targetLanguageId: string;
  title: string;
}

describe('task', () => {
  let ctx: SuiteContext;

  async function listTitles(args: string[] = []): Promise<string[]> {
    const result = await ctx.runner.run(['task', 'list', ...args, '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return (JSON.parse(result.stdout) as ListedTask[]).map((task) => task.title).sort();
  }

  beforeAll(async () => {
    ctx = await setupSuite('task', { targetLanguageIds: ['uk', 'it'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads the labelled sources and Italian translations the rest of the suite needs', async () => {
    // `--label` both creates the label (resolveLabelIds with createMissing) and attaches it to every
    // string, which is what lets a label-filtered task find anything to cover.
    const sources = await ctx.runner.run(['upload', 'sources', '--label', LABEL]);

    expect(sources.exitCode).toBe(0);
    expect(sources.stdout).toContain("File 'sources/1_android.xml'");
    expect(sources.stdout).toContain("File 'sources/2_android.xml'");

    const translations = await ctx.runner.run(['upload', 'translations']);

    expect(translations.exitCode).toBe(0);
    expect(translations.stdout).toContain("File 'translations/it/1_android.xml'");
    // No Ukrainian translations on purpose - that is what leaves `uk` with words to translate.
    expect(translations.stderr).toContain("File 'translations/uk/1_android.xml' does not exist");
  });

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['task']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage tasks');
    expect(result.stdout).toContain('add <title>');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['task', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('reports a project with no tasks', async () => {
    const result = await ctx.runner.run(['task', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No tasks found');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires a title', async () => {
    const result = await ctx.runner.run(['task', 'add']);

    // Commander rejects the missing `<title>` argument before addAction's own
    // `Task title can not be empty` guard can fire, so that guard is unreachable from the CLI.
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("missing required argument 'title'");
  });

  test('requires a language', async () => {
    const result = await ctx.runner.run(['task', 'add', 'T1']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Language can not be empty. (e.g. es-ES, en-US)');
  });

  test('requires at least one file', async () => {
    const result = await ctx.runner.run(['task', 'add', 'T1', '--language', 'uk']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--file' value can not be empty");
  });

  test('requires a type outside Enterprise', async () => {
    const result = await ctx.runner.run(['task', 'add', 'T1', '--language', 'uk', '--file', 'sources/1_android.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Task type can not be empty. Possible values: translate, proofread');
  });

  test('rejects an unsupported type', async () => {
    const result = await ctx.runner.run([
      'task',
      'add',
      'T1',
      '--language',
      'uk',
      '--file',
      'sources/1_android.xml',
      '--type',
      'bogus',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unsupported task type. Possible values: translate, proofread');
  });

  test("rejects --include-pre-translated-strings-only on a 'translate' task", async () => {
    const result = await ctx.runner.run([
      'task',
      'add',
      'T1',
      '--language',
      'uk',
      '--file',
      'sources/1_android.xml',
      '--type',
      'translate',
      '--include-pre-translated-strings-only',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "The '--include-pre-translated-strings-only' option can't be used with the 'translate' task type",
    );
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('warns per unknown file and then refuses to create the task', async () => {
    const result = await ctx.runner.run([
      'task',
      'add',
      'T1',
      '--language',
      'uk',
      '--file',
      'nope.xml',
      '--type',
      'translate',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'nope.xml' file");
    expect(result.stderr).toContain('No valid file specified for the task. At least one valid file is required');
  });

  test('rejects a label the project does not have', async () => {
    // resolveLabelIds(titles, false): a filtering caller never creates the label, because a fresh
    // empty one would make the task cover nothing.
    const result = await ctx.runner.run([
      'task',
      'add',
      'T1',
      '--language',
      'uk',
      '--file',
      'sources/1_android.xml',
      '--type',
      'translate',
      '--label',
      'no-such-label',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'no-such-label' label");
  });

  test('adds a translate task', async () => {
    const result = await ctx.runner.run([
      'task',
      'add',
      'Translate file one',
      '--language',
      'uk',
      '--file',
      'sources/1_android.xml',
      '--type',
      'translate',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('uk Translate file one');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds a translate task filtered by label', async () => {
    // A different file from the task above: the first one already covers every untranslated `uk`
    // word in 1_android.xml, and the API rejects a task with nothing left to cover.
    const result = await ctx.runner.run([
      'task',
      'add',
      'Labelled file two',
      '--language',
      'uk',
      '--file',
      'sources/2_android.xml',
      '--type',
      'translate',
      '--label',
      LABEL,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('uk Labelled file two');
  });

  test('adds a proofread task with a description', async () => {
    // `it` is the language with translations, so it is the only one with unapproved words to
    // proofread.
    const result = await ctx.runner.run([
      'task',
      'add',
      'Proofread file two',
      '--language',
      'it',
      '--file',
      'sources/2_android.xml',
      '--type',
      'proofread',
      '--description',
      'Please proofread the second file',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('it Proofread file two');
  });

  test('lists every task with its id and target language', async () => {
    const result = await ctx.runner.run(['task', 'list']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds status, word count and due date with --verbose', async () => {
    const result = await ctx.runner.run(['task', 'list', '--verbose']);

    expect(result.exitCode).toBe(0);
    // Word counts come from the fixture: 3 strings x 4 words for file one, 2 x 4 for file two.
    // 'NoDueDate' is display-only, printed when the task carries no deadline.
    expect(result.stdout).toContain('todo 12 NoDueDate');
    expect(result.stdout).toContain('todo 8 NoDueDate');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists a bare id and title with --output plain', async () => {
    const result = await ctx.runner.run(['task', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    const lines = result.stdout.split('\n').filter((line) => line.length > 0);

    // The plain view prints the raw id, which `normalize` does not mask (it only masks `#123`), so
    // the id is stripped here rather than snapshotted. Sorted by title for the same reason
    // label.test.ts does: a leading id would otherwise decide the order.
    expect(lines.map((line) => line.replace(/^\d+ /, '')).sort()).toEqual([
      'Labelled file two',
      'Proofread file two',
      'Translate file one',
    ]);

    for (const line of lines) {
      expect(line).toMatch(/^\d+ \S/);
    }
  });

  test('serializes id, target language and title in a structured format', async () => {
    const result = await ctx.runner.run(['task', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const tasks = (JSON.parse(result.stdout) as ListedTask[]).sort((left, right) =>
      left.title < right.title ? -1 : 1,
    );

    expect(tasks).toEqual([
      { id: expect.any(Number), targetLanguageId: 'uk', title: 'Labelled file two' },
      { id: expect.any(Number), targetLanguageId: 'it', title: 'Proofread file two' },
      { id: expect.any(Number), targetLanguageId: 'uk', title: 'Translate file one' },
    ]);
  });

  test('filters by status', async () => {
    // Everything just created is still 'todo', so the two filters bracket the whole set.
    expect(await listTitles(['--status', 'todo'])).toEqual([
      'Labelled file two',
      'Proofread file two',
      'Translate file one',
    ]);
    expect(await listTitles(['--status', 'done'])).toEqual([]);
  });

  test('rejects an unsupported status', async () => {
    const result = await ctx.runner.run(['task', 'list', '--status', 'bogus']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unsupported status: 'bogus'");
  });

  test('rejects a non-numeric --assignee-id', async () => {
    const result = await ctx.runner.run(['task', 'list', '--assignee-id', 'abc']);

    // toNumberArray raises a validation error, which exits 2 rather than the generic 1.
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("The '--assignee-id' value must be numeric");
  });

  test('filters by assignee, client-side', async () => {
    // Nothing here assigns anyone, so any id filters everything out - which is what proves the
    // filter runs at all (listAction filters the fetched tasks itself; the API is not asked).
    const result = await ctx.runner.run(['task', 'list', '--assignee-id', '999999']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No tasks found');
  });
});
