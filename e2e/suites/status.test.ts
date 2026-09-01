import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `status` / `status translation` / `status proofreading`
 * (`cli/commands/status/StatusCommand.ts`). No PHP original to port - written against the TS
 * implementation.
 *
 * Why this suite earns its keep beyond the command itself: `status` is one of only two callers of
 * `output.table()` (the other is `context`), and `normalize()` has a code path built for that
 * output - the contiguous-run rule that sorts `│ … │` rows inside their own table rather than
 * merging every table in the output into one block. Nothing else in `e2e/suites` renders a table,
 * so before this suite that path was asserted only by `normalize`'s own unit tests.
 *
 * The fixture is built so every number is deterministic and every filter is observable:
 *
 *   sources/1_android.xml          5 strings / 20 words
 *   sources/nested/2_android.xml   3 strings / 12 words
 *   translations/uk/**             every string translated; no `it` translations at all
 *
 * so the project sits at uk 100% translated / 0% approved and it 0% / 0%, and the three scopes
 * report totals that tell them apart: project 8 phrases, `--file` 5, `--directory` 3. The scope
 * tests assert those counts rather than the percentages, because uk is 100% at every scope - a
 * percentage assertion would pass just as happily if the filter were ignored entirely.
 *
 * Nothing here approves a string, so `Proofread` stays 0% throughout. That is what makes the
 * `--fail-if-incomplete` pair meaningful in both directions: the default (`all`) and `proofreading`
 * modes fail, while `status translation -l uk` is genuinely complete and exits 0.
 */

const BRANCH = 'status-branch';

interface ProgressEntry {
  language: string;
  translation: number;
  approval: number;
  totalWords?: number;
  totalPhrases?: number;
}

describe('status', () => {
  let ctx: SuiteContext;

  /** Run a status variant in json and parse it - the machine contract, free of table formatting. */
  async function statusJson(args: string[]): Promise<ProgressEntry[]> {
    const result = await ctx.runner.run([...args, '--output', 'json']);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ProgressEntry[];
  }

  beforeAll(async () => {
    ctx = await setupSuite('status', { targetLanguageIds: ['uk', 'it'] });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads the sources and the Ukrainian translations the rest of the suite reads', async () => {
    const sources = await ctx.runner.run(['upload', 'sources']);

    expect(sources.exitCode).toBe(0);
    expect(sources.stdout).toContain("File 'sources/1_android.xml'");
    expect(sources.stdout).toContain("File 'sources/nested/2_android.xml'");

    const translations = await ctx.runner.run(['upload', 'translations']);

    expect(translations.exitCode).toBe(0);
    expect(translations.stdout).toContain("File 'translations/uk/1_android.xml'");
    expect(translations.stdout).toContain("File 'translations/uk/nested/2_android.xml'");
    // The fixture ships no Italian translations on purpose - that is what keeps `it` at 0%.
    expect(translations.stderr).toContain("File 'translations/it/1_android.xml' does not exist");
  });

  test('renders both languages as a table', async () => {
    const result = await ctx.runner.run(['status']);

    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('adds word and phrase columns with --verbose', async () => {
    const result = await ctx.runner.run(['status', '--verbose']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Translated words');
    expect(result.stdout).toContain('Proofread phrases');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('shows only the translation column for `status translation`', async () => {
    const result = await ctx.runner.run(['status', 'translation']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Translated');
    expect(result.stdout).not.toContain('Proofread');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('shows only the proofreading column for `status proofreading`', async () => {
    const result = await ctx.runner.run(['status', 'proofreading']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Proofread');
    expect(result.stdout).not.toContain('Translated');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('serializes one entry per language in a structured format', async () => {
    expect(await statusJson(['status'])).toEqual([
      { language: 'it', translation: 0, approval: 0 },
      { language: 'uk', translation: 100, approval: 0 },
    ]);
  });

  test('prints a titled section per metric with --output plain', async () => {
    const result = await ctx.runner.run(['status', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trimEnd()).toBe(['Translated:', 'it 0', 'uk 100', 'Proofread:', 'it 0', 'uk 0'].join('\n'));
  });

  test('adds the count sections to --output plain with --verbose', async () => {
    const result = await ctx.runner.run(['status', '--output', 'plain', '--verbose']);

    expect(result.exitCode).toBe(0);
    // Word and phrase totals come straight from the fixture: 32 words / 8 phrases across both files.
    expect(result.stdout).toContain('Translated words:\nit 0/32\nuk 32/32');
    expect(result.stdout).toContain('Translated phrases:\nit 0/8\nuk 8/8');
    expect(result.stdout).toContain('Proofread words:\nit 0/32\nuk 0/32');
  });

  test('filters to a single language with --language', async () => {
    expect(await statusJson(['status', '-l', 'uk'])).toEqual([{ language: 'uk', translation: 100, approval: 0 }]);
  });

  test('rejects a language the project does not target', async () => {
    const result = await ctx.runner.run(['status', '-l', 'zz']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Language 'zz' doesn't exist in the project. Try specifying another language code");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('scopes the progress to one file with --file', async () => {
    // 5 of the project's 8 phrases live in this file, which is what proves the filter was applied -
    // uk is 100% at every scope, so the percentage alone would not.
    const [italian] = await statusJson(['status', '-f', 'sources/1_android.xml', '--verbose']);

    expect(italian).toMatchObject({ language: 'it', totalPhrases: 5, totalWords: 20 });
  });

  test('rejects a file the project does not contain', async () => {
    const result = await ctx.runner.run(['status', '-f', 'nope.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'nope.xml' file");
  });

  test('scopes the progress to one directory with --directory', async () => {
    // The remaining 3 phrases, so the file and directory scopes are distinguishable from each other
    // as well as from the whole project.
    const [italian] = await statusJson(['status', '-d', 'sources/nested', '--verbose']);

    expect(italian).toMatchObject({ language: 'it', totalPhrases: 3, totalWords: 12 });
  });

  test('rejects a directory the project does not contain', async () => {
    const result = await ctx.runner.run(['status', '-d', 'nope']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'nope' directory");
  });

  test('rejects --file and --directory together', async () => {
    const result = await ctx.runner.run(['status', '-f', 'sources/1_android.xml', '-d', 'sources/nested']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Only one of the following options can be used at a time: '--file', '--directory'");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('fails on an incomplete project with --fail-if-incomplete', async () => {
    const result = await ctx.runner.run(['status', '--fail-if-incomplete']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The current project is incomplete');
    // The check runs after the table is printed, so a failing run still shows which languages are
    // behind (StatusCommand.ts's comment on throwIfIncomplete).
    expect(result.stdout).toContain('Translated');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('passes --fail-if-incomplete for a fully translated language', async () => {
    // uk is at 100% translated, and `status translation` never looks at approvals - the one
    // combination in this fixture that is genuinely complete.
    const result = await ctx.runner.run(['status', 'translation', '-l', 'uk', '--fail-if-incomplete']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain('incomplete');
  });

  test('fails --fail-if-incomplete for proofreading, which nothing here approves', async () => {
    const result = await ctx.runner.run(['status', 'proofreading', '--fail-if-incomplete']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The current project is incomplete');
  });

  // Last, and deliberately so: `upload sources -b` adds a second, untranslated copy of every string
  // to the project, which drops project-wide progress below 100%. Every test above that reads
  // project-wide numbers - the tables, the json rows, and especially the --fail-if-incomplete pair -
  // depends on that not having happened yet.
  test('scopes the progress to a branch with --branch', async () => {
    const upload = await ctx.runner.run(['upload', 'sources', '-b', BRANCH]);

    expect(upload.exitCode).toBe(0);

    // The branch got its own copies of the sources and no translations at all, so it reads 0% for
    // both languages while the root tree still reads uk 100% - the clearest proof the scope applied.
    expect(await statusJson(['status', '-b', BRANCH])).toEqual([
      { language: 'it', translation: 0, approval: 0 },
      { language: 'uk', translation: 0, approval: 0 },
    ]);
  });

  test('rejects a branch that does not exist', async () => {
    const result = await ctx.runner.run(['status', '-b', 'nope']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The branch with the specified name doesn't exist in the project");
  });
});
