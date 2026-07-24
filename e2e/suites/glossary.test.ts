import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Overwrites the workspace's `crowdin.yml` with one of the `alt-configs/<name>.yml` templates. */
async function switchConfig(ctx: SuiteContext, name: string): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', `${name}.yml`)).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

/** Finds a glossary's numeric id by its exact name, via the API directly (bypassing CLI output). */
async function findGlossaryId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.glossariesApi.withFetchAll().listGlossaries();
  const match = response.data.find((entry) => entry.data.name === name);

  if (!match) {
    throw new Error(`Glossary '${name}' not found via the API`);
  }

  return match.data.id;
}

/**
 * Every project on Crowdin.com gets an automatically created glossary named after it
 * (`Project::getDefaultGlossaryName()` in the PHP backend: `"{$name}'s Glossary"`).
 */
function defaultGlossaryName(ctx: SuiteContext): string {
  return `${ctx.project.name}'s Glossary`;
}

/**
 * Extracts the text content of every `<tag>...</tag>` occurrence in an XML string, guarding the
 * tag-name boundary so e.g. `term` doesn't also match `termEntry`.
 */
function extractTagTexts(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?=[\\s>])[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  return [...xml.matchAll(re)].map((m) => m[1] as string);
}

/**
 * Order-independent TBX content check: the server re-exports TBX in its own dialect (different
 * termEntry ids, element ordering), so byte-equality against the source isn't meaningful - instead
 * compare the sorted sets of `<term>` and `<descrip>` text content, which the roundtrip must preserve.
 */
async function extractTbxContent(path: string): Promise<{ terms: string[]; descriptions: string[] }> {
  const xml = await Bun.file(path).text();
  return {
    terms: extractTagTexts(xml, 'term').sort(),
    descriptions: extractTagTexts(xml, 'descrip').sort(),
  };
}

/**
 * Order-independent XLSX content check. An xlsx is a zip container, so raw byte-equality isn't
 * reliable (zip/docProps metadata differs run to run) - unzip with `adm-zip` (already a project
 * dependency, see DownloadCommand/BundleCommand) and compare the sorted set of visible text runs
 * from both the shared-strings table and the worksheet's own inline strings, covering either
 * encoding a workbook writer may choose.
 */
function extractXlsxTexts(path: string): string[] {
  const zip = new AdmZip(path);
  const texts: string[] = [];

  for (const entryName of ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']) {
    const entry = zip.getEntry(entryName);

    if (entry) {
      texts.push(...extractTagTexts(entry.getData().toString('utf-8'), 't'));
    }
  }

  return texts.sort();
}

describe('glossary', () => {
  let ctx: SuiteContext;
  let tbxGlossaryId: number;
  let csvGlossaryId: number;
  let xlsxGlossaryId: number;

  beforeAll(async () => {
    ctx = await setupSuite('glossary');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads a TBX glossary, creating it', async () => {
    const result = await ctx.runner.run(['glossary', 'upload', 'sources/simple-glossary.tbx', '--language', 'uk']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Imported in #');
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-glossary.tbx)' glossary");
    expect(normalize(result.stdout)).toMatchSnapshot();

    tbxGlossaryId = await findGlossaryId(ctx, 'Created in Crowdin CLI (simple-glossary.tbx)');
  });

  test('lists glossaries verbosely, including their terms', async () => {
    const result = await ctx.runner.run(['glossary', 'list', '-v']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultGlossaryName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.tbx)');
    // Spot-check one term/description pair from the uploaded TBX (see sources/simple-glossary.tbx).
    expect(result.stdout).toContain('zuerst');
    expect(result.stdout).toContain('zuerst Beschreibung');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads a CSV glossary with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'glossary',
      'upload',
      'sources/simple-glossary.csv',
      '--language',
      'en',
      '--scheme',
      'term_en=1',
      '--scheme',
      'partOfSpeech_en=2',
      '--scheme',
      'description_en=3',
      '--scheme',
      'term_ar=4',
      '--scheme',
      'description_ar=5',
      '--scheme',
      'term_zh-CN=6',
      '--scheme',
      'description_zh-CN=7',
      '--scheme',
      'term_de=8',
      '--scheme',
      'description_de=9',
      '--scheme',
      'term_uk=10',
      '--scheme',
      'description_uk=11',
      '--first-line-contains-header',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-glossary.csv)' glossary");
    expect(normalize(result.stdout)).toMatchSnapshot();

    csvGlossaryId = await findGlossaryId(ctx, 'Created in Crowdin CLI (simple-glossary.csv)');
  });

  test('uploads an XLSX glossary with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'glossary',
      'upload',
      'sources/simple-glossary.xlsx',
      '--language',
      'uk',
      '--scheme',
      'term_en=1',
      '--scheme',
      'description_en=2',
      '--scheme',
      'term_ar=3',
      '--scheme',
      'description_ar=4',
      '--scheme',
      'term_zh-CN=5',
      '--scheme',
      'description_zh-CN=6',
      '--scheme',
      'term_de=7',
      '--scheme',
      'description_de=8',
      '--scheme',
      'term_uk=9',
      '--scheme',
      'description_uk=10',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-glossary.xlsx)' glossary");
    expect(normalize(result.stdout)).toMatchSnapshot();

    xlsxGlossaryId = await findGlossaryId(ctx, 'Created in Crowdin CLI (simple-glossary.xlsx)');
  });

  test('lists all glossaries in the project', async () => {
    const result = await ctx.runner.run(['glossary', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultGlossaryName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.tbx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.xlsx)');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads the TBX glossary by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-glossary.tbx).tbx';

    const result = await ctx.runner.run(['glossary', 'download', String(tbxGlossaryId), '--format', 'tbx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building glossary');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    const uploaded = await extractTbxContent(join(ctx.workspace, 'sources/simple-glossary.tbx'));
    const downloaded = await extractTbxContent(join(ctx.workspace, file));
    expect(downloaded.terms).toEqual(uploaded.terms);
    expect(downloaded.descriptions).toEqual(uploaded.descriptions);
  });

  test('downloads the CSV glossary by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-glossary.csv).csv';

    const result = await ctx.runner.run(['glossary', 'download', String(csvGlossaryId), '--format', 'csv']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building glossary');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await Bun.file(join(ctx.workspace, file)).text()).toBe(
      await Bun.file(join(ctx.workspace, 'expected/simple-glossary.csv')).text(),
    );
  });

  test('downloads the XLSX glossary by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-glossary.xlsx).xlsx';

    const result = await ctx.runner.run(['glossary', 'download', String(xlsxGlossaryId), '--format', 'xlsx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building glossary');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(extractXlsxTexts(join(ctx.workspace, file))).toEqual(
      extractXlsxTexts(join(ctx.workspace, 'expected/simple-glossary.xlsx')),
    );
  });

  test('downloads the TBX glossary without an explicit format', async () => {
    const file = 'Created in Crowdin CLI (simple-glossary.tbx).tbx';

    const result = await ctx.runner.run(['glossary', 'download', String(tbxGlossaryId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test("downloads the project's default glossary by id", async () => {
    const defaultGlossaryId = await findGlossaryId(ctx, defaultGlossaryName(ctx));
    const file = `${defaultGlossaryName(ctx)}.tbx`;

    const result = await ctx.runner.run(['glossary', 'download', String(defaultGlossaryId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('lists glossaries authenticating via -T against a config without an api_token', async () => {
    await switchConfig(ctx, 'without-token');

    const result = await ctx.runner.run(['glossary', 'list', '-T', ctx.env.token as string]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultGlossaryName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.tbx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-glossary.xlsx)');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
