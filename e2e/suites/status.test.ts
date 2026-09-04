import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `status` / `status translation` / `status proofreading`
 * (`cli/commands/status/StatusCommand.ts`).
 *
 * `status` is one of only two `output.table()` callers, so this is the only suite exercising
 * `normalize`'s table path - the rule that sorts `│ … │` rows inside their own table rather than
 * merging every table into one block.
 *
 * The fixture makes every number deterministic and every filter observable:
 *
 *   sources/1_android.xml          5 strings / 20 words
 *   sources/nested/2_android.xml   3 strings / 12 words
 *   translations/uk/**             fully translated; no `it` translations
 *
 * leaving uk at 100% translated / 0% approved and it at 0% / 0%. Nothing approves a string, which
 * is what makes the `--fail-if-incomplete` trio meaningful in both directions.
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
    // Counts, not percentages: uk is 100% at every scope, so only the totals prove the filter ran.
    const [italian] = await statusJson(['status', '-f', 'sources/1_android.xml', '--verbose']);

    expect(italian).toMatchObject({ language: 'it', totalPhrases: 5, totalWords: 20 });
  });

  test('rejects a file the project does not contain', async () => {
    const result = await ctx.runner.run(['status', '-f', 'nope.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Project doesn't contain the 'nope.xml' file");
  });

  test('scopes the progress to one directory with --directory', async () => {
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
    // The check runs after the table is printed, so a failing run still shows what is behind.
    expect(result.stdout).toContain('Translated');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('passes --fail-if-incomplete for a fully translated language', async () => {
    // The one genuinely complete combination here: `status translation` ignores approvals.
    const result = await ctx.runner.run(['status', 'translation', '-l', 'uk', '--fail-if-incomplete']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toContain('incomplete');
  });

  test('fails --fail-if-incomplete for proofreading, which nothing here approves', async () => {
    const result = await ctx.runner.run(['status', 'proofreading', '--fail-if-incomplete']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The current project is incomplete');
  });

  // Must stay last: `upload sources -b` adds a second untranslated copy of every string, dropping
  // project-wide progress below 100% for every test above.
  test('scopes the progress to a branch with --branch', async () => {
    const upload = await ctx.runner.run(['upload', 'sources', '-b', BRANCH]);

    expect(upload.exitCode).toBe(0);

    // The branch has its own untranslated copies, so 0% here against uk 100% on the root tree.
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
