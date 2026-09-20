import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFailure } from '../helpers/cli.ts';
import { normalize } from '../helpers/normalize.ts';
import { createExtraProject, runJson, type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `auto-translate`'s validation order and the flags that select what gets translated
 * (`cli/commands/auto-translate/AutoTranslateCommand.ts`). The MT paths belong to
 * `auto-translate-mt.test.ts`.
 *
 * Every real run uses `--method tm`, which needs no engine and finishes against an empty TM.
 * `preTranslate` polls to completion, so a zero exit means the server finished the job.
 */
const SOURCE_FILE = '/sources/app.xml';
const NESTED_FILE = '/sources/nested/extra.xml';

describe('auto-translate', () => {
  let ctx: SuiteContext;
  let stringsBasedProjectId: number;

  beforeAll(async () => {
    ctx = await setupSuite('auto-translate');
    // The string-based guards need a project of that kind; this suite's own is file-based.
    stringsBasedProjectId = await createExtraProject(ctx, { suite: 'auto-translate-strings', stringsBased: true });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain("File 'sources/app.xml'");
    expect(result.stdout).toContain("File 'sources/nested/extra.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires --method', async () => {
    const result = await ctx.runner.run(['auto-translate']);

    expectFailure(result, 1, "Missing required option '--method'. Supported values: mt, tm, ai");
  });

  test('rejects an unsupported --method', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'human']);

    expectFailure(result, 1, "Invalid value for '--method'. Supported values: mt, tm, ai");
  });

  // The checks below run in the order `defaultAction` declares them, before the project is loaded.
  test('refuses --file together with --directory', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--directory',
      '/sources',
    ]);

    expectFailure(result, 1, "Either '--file' or '--directory' can be specified");
  });

  test('refuses --language together with --exclude-language', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--language',
      'uk',
      '--exclude-language',
      'it',
    ]);

    expectFailure(result, 1, "The '--language' and '--exclude-language' options can't be used simultaneously");
  });

  test('restricts --translate-with-perfect-match-only to the TM method', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'mt',
      '--engine-id',
      '1',
      '--translate-with-perfect-match-only',
    ]);

    expectFailure(result, 1, "'--translate-with-perfect-match-only' only works with the TM auto-translation method");
  });

  test('requires --ai-prompt for the AI method', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'ai']);

    expectFailure(result, 1, "AI should be used with the '--ai-prompt' parameter");
  });

  test('rejects an unsupported --auto-approve-option', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--auto-approve-option', 'sometimes']);

    expectFailure(result, 1, "Wrong '--auto-approve-option' parameter");
  });

  // --replace-translations-option declares `choices`, so commander rejects a bad value as a usage
  // error (exit 2) and `resolveReplaceTranslationsOption`'s own message never fires. Its sibling
  // --auto-approve-option declares none, which is why that one still reports at exit 1 above.
  test('rejects an unsupported --replace-translations-option', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--replace-translations-option',
      'sometimes',
    ]);

    expectFailure(result, 2, 'sometimes');
  });

  test('rejects a language the project does not target', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--language', 'de']);

    expectFailure(result, 1, "Language(s) 'de' doesn't exist in the project");
  });

  test('rejects an excluded language the project does not target', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--exclude-language', 'de']);

    expectFailure(result, 1, "Language(s) 'de' doesn't exist in the project");
  });

  test('fails on a branch the project does not hold', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '-b', 'no-such-branch']);

    expectFailure(result, 1, "Branch 'no-such-branch' doesn't exist in the project");
  });

  test('fails on a single --file the project does not hold', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', '/sources/missing.xml']);

    expectFailure(result, 1, "Project doesn't contain the '/sources/missing.xml' file");
  });

  test('finds no files to translate under an empty --directory', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--directory', '/nowhere']);

    expectFailure(result, 1, "Couldn't find any files to Auto-Translate in the current project");
  });

  test('translates the whole project', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm']);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('translates a single file', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', SOURCE_FILE]);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('warns per missing file and fails at the end when several are given', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--file',
      '/sources/missing.xml',
    ]);

    expectFailure(
      result,
      1,
      "Project doesn't contain the '/sources/missing.xml' file",
      'Some of the specified files were not found in the project',
    );
  });

  test('translates the files of a --directory', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--directory', '/sources/nested']);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('accepts --language all alongside --exclude-language', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--language',
      'all',
      '--exclude-language',
      'it',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('warns about a label the project is missing', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--label', 'no-such-label']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain("The 'no-such-label' label is missing in the Crowdin project");
  });

  test('warns about a missing exclude label', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--exclude-label', 'no-such-label']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stderr).toContain("The 'no-such-label' label is missing in the Crowdin project");
  });

  // The request-shaping flags are not freely combinable: the API refuses
  // translation-modified-before and replace-translations-option unless the scope covers translated
  // strings, and reset-approval-status unless auto-approve and skip-approved are left alone. These
  // two runs are the coherent halves of that constraint.
  test('accepts the re-translation flags', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'translated',
      '--replace-translations-option',
      'auto-translated',
      '--translation-modified-before',
      '2030-01-01T00:00:00Z',
      '--reset-approval-status',
      '--duplicate-translations',
      '--translate-with-perfect-match-only',
      '--priority',
      'high',
      '--source-language',
      'en',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('accepts the untranslated-scope flags', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'untranslated',
      '--auto-approve-option',
      'perfect-match-only',
      '--duplicate-translations',
      '--skip-approved-translations',
      '--translate-with-perfect-match-only',
      '--priority',
      'low',
      '--source-language',
      'en',
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
  });

  test('surfaces the API refusal when the flags contradict each other', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--scope',
      'untranslated',
      '--replace-translations-option',
      'auto-translated',
    ]);

    expectFailure(
      result,
      1,
      'Key: replaceTranslationsOption',
      'Field cannot be set when [scope] has the current value',
    );
  });

  test('passes a --translation-modified-before value straight to the API', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      NESTED_FILE,
      '--translation-modified-before',
      '2030-01-01',
    ]);

    expectFailure(result, 1, 'valid date in ISO 8601 format');
  });

  test('reports the totals under --verbose', async () => {
    const result = await ctx.runner.run(['auto-translate', '--method', 'tm', '--file', SOURCE_FILE, '--verbose']);

    expect(result).toMatchObject({ exitCode: 0 });

    for (const line of ['- files:', '- phrases:', '- words:', '- skipped:']) {
      expect(result.stdout).toContain(line);
    }
  });

  test('reports the job in the json output', async () => {
    const job = await runJson<{ identifier: string; status: string }>(ctx, [
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
    ]);

    expect(job.identifier).toBeTruthy();
    expect(job.status).toBe('finished');
  });

  test('rejects --file against a string-based project', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--file',
      SOURCE_FILE,
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expectFailure(result, 1, 'File management is not available for string-based projects');
  });

  test('requires a branch for a string-based project', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--method',
      'tm',
      '--project-id',
      String(stringsBasedProjectId),
    ]);

    expectFailure(result, 1, 'Branch is required for string-based projects');
  });
});
