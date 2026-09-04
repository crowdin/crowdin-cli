import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ports crowdin-backend/tests/Cli/Common/CliPreTranslateTest.php. The PHP `pre-translate` command
 * has no src-next equivalent; every scenario maps onto an `auto-translate` flag instead, so nothing
 * was dropped. Validation and selection flags live in `auto-translate.test.ts`; this suite owns the
 * MT paths.
 *
 * `preTranslate` polls to completion, so a zero exit means the server finished the job. But with
 * `--no-progress` every poll iteration prints its own line and the count varies per run, so the
 * successful runs assert deterministic markers with `toContain` rather than snapshotting. The
 * `--engine-id` error never reaches the poll loop and keeps its snapshot.
 */

/**
 * The built-in "Crowdin Translate" engine, the one MT engine that needs no credentials configured.
 * Looked up by name because the API exposes no stable id for it.
 */
async function getCrowdinMtEngineId(ctx: SuiteContext): Promise<number> {
  const mts = await ctx.client.machineTranslationApi.listMts();
  const crowdinEngine = mts.data.find((mt) => mt.data.name === 'Crowdin Translate');

  if (!crowdinEngine) {
    throw new Error("Could not find the built-in 'Crowdin Translate' MT engine for this test account");
  }

  return crowdinEngine.data.id;
}

/**
 * Mirrors the PHP suite's `config/crowdin_without_token.yml`: no `project_id`/`api_token`, so both
 * must come from `--project-id`/`--token`. Written into the workspace rather than shipped as a
 * fixture, since `copyFixtures` skips the fixture `config/` directory.
 */
async function writeTokenlessConfig(ctx: SuiteContext): Promise<string> {
  const configPath = join(ctx.workspace, 'crowdin-without-token.yml');

  await Bun.write(
    configPath,
    [
      'base_path: "."',
      'base_url: "https://api.crowdin.com"',
      'preserve_hierarchy: false',
      '',
      'files:',
      '  - source: "/sources/*.xml"',
      '    translation: "/translations/%two_letters_code%/%original_file_name%"',
    ].join('\n'),
  );

  return configPath;
}

describe('auto-translate via MT', () => {
  let ctx: SuiteContext;
  let crowdinMtEngineId: number;

  beforeAll(async () => {
    ctx = await setupSuite('auto-translate-mt', { targetLanguageIds: ['uk'] });
    crowdinMtEngineId = await getCrowdinMtEngineId(ctx);
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    // Success lines report the PROJECT path, not the local one, and the fixture's
    // `preserve_hierarchy: false` strips the shared `sources/` parent (see the note on the next
    // test), so what lands in the project - and in the output - is the bare filename.
    expect(result.stdout).toContain("File '1_android.xml'");
    expect(result.stdout).toContain("File '2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // The fixture's `preserve_hierarchy: false` strips the shared "sources/" parent from the project
  // path (`getCommonPath`/`resolveProjectPath` in `UploadSourcesCommand.ts`), so the file that lands
  // in the project is named "1_android.xml" - not "sources/1_android.xml" like the local path
  // asserted above. `--file` below must match that server-side project path.
  test('pre-translates via translation memory (TM)', async () => {
    const result = await ctx.runner.run(['auto-translate', '--file', '1_android.xml', '-l', 'uk', '--method', 'tm']);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('requires --engine-id for the MT method', async () => {
    const result = await ctx.runner.run(['auto-translate', '-l', 'uk', '--method', 'mt']);

    expect(result.exitCode).toBe(1);
    // The `CliError` this raises goes through `diagnostic()`, which writes to stderr in every output
    // format (`cli/utils/output.ts`) so that stdout only ever carries the result document — empty here,
    // since the command fails long before producing one. Both the assertion and the snapshot therefore
    // read stderr; snapshotting stdout would record nothing but an empty string.
    expect(result.stderr).toContain("Machine Translation should be used with the '--engine-id' parameter");
    expect(normalize(result.stderr)).toMatchSnapshot();
  });

  test('pre-translates via machine translation (MT) with an explicit engine id', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--file',
      '1_android.xml',
      '-l',
      'uk',
      '--method',
      'mt',
      '--engine-id',
      String(crowdinMtEngineId),
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('warns when --auto-approve-option is used with the MT method', async () => {
    const result = await ctx.runner.run([
      'auto-translate',
      '--file',
      '1_android.xml',
      '-l',
      'uk',
      '--method',
      'mt',
      '--engine-id',
      String(crowdinMtEngineId),
      '--auto-approve-option',
      'all',
    ]);

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    // `output.warning` is a diagnostic too, so it lands on stderr for the same reason as the
    // `--engine-id` error above; the auto-translation progress itself still goes to stdout.
    expect(result.stderr).toContain("'--auto-approve-option' is used only for the TM Auto-Translation method");
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('pre-translates via TM using --token/--project-id instead of a config file', async () => {
    const configPath = await writeTokenlessConfig(ctx);

    const result = await ctx.runner.run(
      [
        'auto-translate',
        '--file',
        '1_android.xml',
        '-l',
        'uk',
        '--method',
        'tm',
        '--project-id',
        String(ctx.project.id),
        '--token',
        ctx.env.token as string,
        '--config',
        configPath,
        '--no-progress',
        '--no-colors',
      ],
      { noConfig: true },
    );

    if (result.exitCode !== 0) {
      console.log('--- stdout ---\n', result.stdout, '\n--- stderr ---\n', result.stderr);
    }

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });
});
