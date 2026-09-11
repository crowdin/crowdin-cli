import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Ports crowdin-backend/tests/Cli/Common/CliPreTranslateTest.php onto `auto-translate` flags. This
 * suite owns the MT paths; validation and selection flags live in `auto-translate.test.ts`.
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
 * No `project_id`/`api_token`, so both must come from `--project-id`/`--token`. Written into the
 * workspace rather than shipped as a fixture, since `copyFixtures` skips the fixture `config/` directory.
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

    expect(result).toMatchObject({ exitCode: 0 });
    // Success lines echo the project path, which `preserve_hierarchy: false` flattens to the bare filename.
    expect(result.stdout).toContain("File '1_android.xml'");
    expect(result.stdout).toContain("File '2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // `--file` takes that flattened project path, not the local `sources/1_android.xml`.
  test('pre-translates via translation memory (TM)', async () => {
    const result = await ctx.runner.run(['auto-translate', '--file', '1_android.xml', '-l', 'uk', '--method', 'tm']);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });

  test('requires --engine-id for the MT method', async () => {
    const result = await ctx.runner.run(['auto-translate', '-l', 'uk', '--method', 'mt']);

    expect(result.exitCode).toBe(1);
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
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

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain('Fetching project info');
    expect(result.stdout).toContain('Auto-translation is running...');
    expect(result.stdout).toContain('Auto-translation is finished (100%)');
  });
});
