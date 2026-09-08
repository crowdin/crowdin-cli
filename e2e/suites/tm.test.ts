import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { decode } from '@toon-format/toon';
import AdmZip from 'adm-zip';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

/** Finds a translation memory's numeric id by its exact name, via the API directly. */
async function findTmId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.translationMemoryApi.withFetchAll().listTm();
  const match = response.data.find((entry) => entry.data.name === name);

  if (!match) {
    throw new Error(`Translation memory '${name}' not found via the API`);
  }

  return match.data.id;
}

/**
 * Every project on Crowdin.com gets an automatically created TM named after it
 * (`Project::getDefaultTmName()` in the PHP backend: `"{$name}'s TM"`).
 */
function defaultTmName(ctx: SuiteContext): string {
  return `${ctx.project.name}'s TM`;
}

/**
 * Order-independent TMX content check, grouped by language: the server re-exports TMX in its own
 * dialect (different `tuid`s, added `creationid`/`creationdate`, `<tu>`/`<tuv>` reordered - the `en`
 * `<tuv>` comes first in the server's own export, `ar` first in the uploaded source), so
 * byte-equality isn't meaningful. Compare the sorted set of `<seg>` texts per `xml:lang`, which the
 * roundtrip/filtering must preserve.
 */
function extractTmxSegmentsByLanguage(xml: string): Record<string, string[]> {
  const byLanguage: Record<string, string[]> = {};

  // The exporter writes `<tuv xml:lang="en" creationid="..." creationdate="...">`, so the attribute
  // list around xml:lang has to be tolerated - anchoring on `">` alone matches nothing.
  for (const tuvMatch of xml.matchAll(/<tuv\b[^>]*\bxml:lang="([^"]+)"[^>]*>([\s\S]*?)<\/tuv>/g)) {
    const language = tuvMatch[1] as string;
    const segMatch = /<seg>([\s\S]*?)<\/seg>/.exec(tuvMatch[2] as string);

    if (segMatch) {
      if (!byLanguage[language]) {
        byLanguage[language] = [];
      }

      byLanguage[language].push(segMatch[1] as string);
    }
  }

  for (const language of Object.keys(byLanguage)) {
    (byLanguage[language] as string[]).sort();
  }

  return byLanguage;
}

/** Order-independent line comparison for the exported CSV, matching how bundle.test.ts compares exported text. */
async function sortedLines(path: string): Promise<string[]> {
  const content = await Bun.file(path).text();
  return content.split('\n').sort();
}

/**
 * Order-independent XLSX content check. An xlsx is a zip container, so raw byte-equality isn't
 * reliable (zip/docProps metadata differs run to run) - unzip with `adm-zip` and compare the sorted
 * set of visible text runs from both the shared-strings table and the worksheet's own inline
 * strings, covering either encoding a workbook writer may choose (same approach as glossary.test.ts).
 */
function extractXlsxTexts(path: string): string[] {
  const zip = new AdmZip(path);
  const texts: string[] = [];

  for (const entryName of ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml']) {
    const entry = zip.getEntry(entryName);

    if (entry) {
      const xml = entry.getData().toString('utf-8');
      texts.push(...[...xml.matchAll(/<t(?=[\s>])[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1] as string));
    }
  }

  return texts.sort();
}

/**
 * The three names the CLI derives from this suite's fixtures (`Created in Crowdin CLI (<file>)`).
 *
 * Translation memories belong to the account, not to the project, so `teardownSuite` cannot reach
 * them - and since the name comes from the uploaded file, a leftover from an interrupted run makes
 * every `tm upload` below fail with "The name '...' is already taken". They are swept both before
 * the suite (self-healing) and after it.
 */
/** Far outside the account's id range, so `tmService.get` answers 404 rather than someone's TM. */
const MISSING_TM_ID = 999999999;

const SUITE_TM_NAMES = ['simple-tm.tmx', 'simple-tm.csv', 'simple-tm.xlsx'].map(
  (file) => `Created in Crowdin CLI (${file})`,
);

/** Deletes every account TM this suite owns by name. Never throws: cleanup must not mask a result. */
async function removeSuiteTms(ctx: SuiteContext): Promise<void> {
  try {
    const response = await ctx.client.translationMemoryApi.withFetchAll().listTm();

    for (const entry of response.data) {
      if (SUITE_TM_NAMES.includes(entry.data.name)) {
        await ctx.client.translationMemoryApi.deleteTm(entry.data.id);
      }
    }
  } catch (error) {
    console.warn(`Failed to clean up this suite's translation memories: ${error}`);
  }
}

describe('tm', () => {
  let ctx: SuiteContext;
  let tmxId: number;
  let csvId: number;
  let xlsxId: number;

  beforeAll(async () => {
    ctx = await setupSuite('tm');
    await removeSuiteTms(ctx);
  });

  afterAll(async () => {
    if (ctx && !ctx.env.keep) {
      await removeSuiteTms(ctx);
    }

    await teardownSuite(ctx);
  });

  // `uploadAction` validates before it builds any service, so none of these reach the API.
  test('rejects a file that does not exist', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/missing.tmx', '--language', 'en']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("File 'sources/missing.tmx' not found in the Crowdin project");
  });

  test('rejects a directory', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources', '--language', 'en']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('The specified file is a directory');
  });

  test('rejects a CSV without a scheme', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/simple-tm.csv', '--language', 'uk']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Scheme is required for CSV or XLS/XLSX files');
  });

  test('rejects a malformed --scheme value', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.csv',
      '--language',
      'uk',
      '--scheme',
      'en',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("The '--scheme' parameter has an invalid value 'en'");
  });

  test('rejects an unsupported file extension', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/unsupported.txt', '--language', 'en']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Supported formats: tmx, csv, xlsx');
  });

  test('rejects --first-line-contains-header for a TMX file', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.tmx',
      '--language',
      'en',
      '--first-line-contains-header',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--first-line-contains-header' is used only for CSV or XLS/XLSX files");
  });

  test('requires --language when creating a new translation memory', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/simple-tm.tmx']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--language' is required for creating new translation memory");
  });

  test('uploads a TMX translation memory, creating it', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/simple-tm.tmx', '--language', 'en']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Imported in #');
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.tmx)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    tmxId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.tmx)');
  });

  test('uploads a CSV translation memory with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.csv',
      '--language',
      'uk',
      '--scheme',
      'ar=1',
      '--scheme',
      'de=2',
      '--scheme',
      'en=3',
      '--scheme',
      'uk=4',
      '--scheme',
      'zh-CN=5',
      '--first-line-contains-header',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.csv)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    csvId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.csv)');
  });

  test('uploads an XLSX translation memory with an explicit scheme, creating it', async () => {
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.xlsx',
      '--language',
      'uk',
      '--scheme',
      'ar=1',
      '--scheme',
      'de=2',
      '--scheme',
      'en=3',
      '--scheme',
      'uk=4',
      '--scheme',
      'zh-CN=5',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("'Created in Crowdin CLI (simple-tm.xlsx)' translation memory");
    expect(normalize(result.stdout)).toMatchSnapshot();

    xlsxId = await findTmId(ctx, 'Created in Crowdin CLI (simple-tm.xlsx)');
  });

  test('lists all translation memories in the project', async () => {
    const result = await ctx.runner.run(['tm', 'list']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultTmName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.tmx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.xlsx)');
    // No snapshot here: `tm list` lists everything on the account, so the output includes
    // every other project's and user's entries on this shared test account and changes between
    // runs. The name assertions above plus the API cross-check below are the stable contract.

    // Cross-check the segment counts the PHP suite asserted via table text, directly via the
    // API - `tm list` renders through `console.table`, which isn't something to hand-assert.
    const tms = await ctx.client.translationMemoryApi.withFetchAll().listTm();
    const segmentsByName = new Map(tms.data.map((entry) => [entry.data.name, entry.data.segmentsCount]));
    expect(segmentsByName.get(defaultTmName(ctx))).toBe(0);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.tmx)')).toBe(4);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.csv)')).toBe(4);
    expect(segmentsByName.get('Created in Crowdin CLI (simple-tm.xlsx)')).toBe(4);
  });

  test('serializes id, name and segment count in the json listing', async () => {
    const result = await ctx.runner.run(['tm', 'list', '--output', 'json']);

    expect(result.exitCode).toBe(0);

    const listed = JSON.parse(result.stdout) as { id: number; name: string; segmentsCount: number }[];
    const suiteTms = listed.filter((tm) => SUITE_TM_NAMES.includes(tm.name));

    expect(suiteTms.map((tm) => tm.name).sort()).toEqual([...SUITE_TM_NAMES].sort());
    expect(suiteTms.every((tm) => Object.keys(tm).join() === 'id,name,segmentsCount')).toBe(true);
    expect(suiteTms.every((tm) => tm.segmentsCount === 4)).toBe(true);
  });

  test('carries the same listing in the toon output', async () => {
    const json = await ctx.runner.run(['tm', 'list', '--output', 'json']);
    const toon = await ctx.runner.run(['tm', 'list', '--output', 'toon']);

    expect(toon.exitCode).toBe(0);
    expect(decode(toon.stdout)).toEqual(JSON.parse(json.stdout));
  });

  test('lists bare names in the plain output', async () => {
    const result = await ctx.runner.run(['tm', 'list', '--output', 'plain']);

    expect(result.exitCode).toBe(0);

    const names = result.stdout.split('\n').filter((line) => line.length > 0);

    for (const name of SUITE_TM_NAMES) {
      expect(names).toContain(name);
    }
  });

  // Like the upload guards, these all fire before the TM is fetched - hence the arbitrary id.
  test('rejects a non-numeric translation memory id', async () => {
    const result = await ctx.runner.run(['tm', 'download', 'not-a-number']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Translation memory id must be numeric');
  });

  test('rejects a --to extension that is not a supported format', async () => {
    const result = await ctx.runner.run(['tm', 'download', '1', '--to', 'download/out.txt']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Supported formats: tmx, csv, xlsx');
  });

  test('rejects --source-language-id without --target-language-id', async () => {
    const result = await ctx.runner.run(['tm', 'download', '1', '--source-language-id', 'en']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--target-language-id' must be specified along with '--source-language-id'");
  });

  test('rejects --target-language-id without --source-language-id', async () => {
    const result = await ctx.runner.run(['tm', 'download', '1', '--target-language-id', 'uk']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'--source-language-id' must be specified along with '--target-language-id'");
  });

  test('reports a translation memory that does not exist', async () => {
    const result = await ctx.runner.run(['tm', 'download', String(MISSING_TM_ID)]);

    expect(result.exitCode).toBe(102);
    expect(result.stderr).toContain('Not Found');
  });

  test('downloads the TMX translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.tmx).tmx';

    const result = await ctx.runner.run(['tm', 'download', String(tmxId), '--format', 'tmx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    const downloaded = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, file)).text());
    const expected = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, 'expected/simple-tm.tmx')).text());
    expect(downloaded).toEqual(expected);
  });

  test('downloads the CSV translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.csv).csv';

    const result = await ctx.runner.run(['tm', 'download', String(csvId), '--format', 'csv']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(await sortedLines(join(ctx.workspace, file))).toEqual(
      await sortedLines(join(ctx.workspace, 'expected/simple-tm.csv')),
    );
  });

  test('downloads the XLSX translation memory by id and format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.xlsx).xlsx';

    const result = await ctx.runner.run(['tm', 'download', String(xlsxId), '--format', 'xlsx']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Building translation memory');
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    expect(extractXlsxTexts(join(ctx.workspace, file))).toEqual(
      extractXlsxTexts(join(ctx.workspace, 'expected/simple-tm.xlsx')),
    );
  });

  test('downloads the TMX translation memory filtered by a language pair', async () => {
    const file = 'download/simple-tm_en-uk.tmx';

    const result = await ctx.runner.run([
      'tm',
      'download',
      String(tmxId),
      '--to',
      file,
      '--source-language-id',
      'en',
      '--target-language-id',
      'uk',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();

    const downloaded = extractTmxSegmentsByLanguage(await Bun.file(join(ctx.workspace, file)).text());
    const expected = extractTmxSegmentsByLanguage(
      await Bun.file(join(ctx.workspace, 'expected/simple-tm_en-uk.tmx')).text(),
    );
    expect(downloaded).toEqual(expected);
  });

  test('downloads the TMX translation memory without an explicit format', async () => {
    const file = 'Created in Crowdin CLI (simple-tm.tmx).tmx';

    const result = await ctx.runner.run(['tm', 'download', String(tmxId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test("downloads the project's default translation memory by id", async () => {
    const defaultTmId = await findTmId(ctx, defaultTmName(ctx));
    const file = `${defaultTmName(ctx)}.tmx`;

    const result = await ctx.runner.run(['tm', 'download', String(defaultTmId)]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('echoes the written path in the plain and json download output', async () => {
    const file = 'download/plain-output.tmx';
    const plain = await ctx.runner.run(['tm', 'download', String(tmxId), '--to', file, '--output', 'plain']);

    expect(plain.exitCode).toBe(0);
    expect(plain.stdout.trim()).toBe(file);

    const json = await ctx.runner.run(['tm', 'download', String(tmxId), '--to', file, '--output', 'json']);

    expect(json.exitCode).toBe(0);
    expect(JSON.parse(json.stdout)).toBe(file);
  });

  // Last of the TM-mutating tests: it imports into the TMX memory the download tests read, so it has
  // to run after them.
  test('uploads into an existing translation memory with --id', async () => {
    // A separate fixture on purpose: re-importing `simple-tm.tmx` would dedupe to the same 4 and
    // leave the segment count unable to move.
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/extra-tm.tmx',
      '--id',
      String(tmxId),
      '--output',
      'json',
    ]);

    expect(result.exitCode).toBe(0);

    const imported = JSON.parse(result.stdout) as { id: number; name: string; segmentsCount: number };

    expect(imported.id).toBe(tmxId);
    expect(imported.name).toBe('Created in Crowdin CLI (simple-tm.tmx)');
    // Refetched after the import: the copy taken before it still reports the original 4.
    expect(imported.segmentsCount).toBeGreaterThan(4);

    const tms = await ctx.client.translationMemoryApi.withFetchAll().listTm();
    const matching = tms.data.filter((entry) => entry.data.name === 'Created in Crowdin CLI (simple-tm.tmx)');

    expect(matching).toHaveLength(1);
  });

  test('accepts a comma-joined --scheme', async () => {
    // `--id` keeps this from minting a second TM under an already-taken name.
    const result = await ctx.runner.run([
      'tm',
      'upload',
      'sources/simple-tm.csv',
      '--id',
      String(csvId),
      '--scheme',
      'ar=1,de=2,en=3,uk=4,zh-CN=5',
      '--first-line-contains-header',
      '--output',
      'json',
    ]);

    expect(result.exitCode).toBe(0);
    expect((JSON.parse(result.stdout) as { id: number }).id).toBe(csvId);
  });

  test('rejects a non-numeric --id on upload', async () => {
    const result = await ctx.runner.run(['tm', 'upload', 'sources/simple-tm.tmx', '--id', 'not-a-number']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Translation memory id must be numeric');
  });

  test('lists translation memories authenticating via -T against a config without an api_token', async () => {
    await switchConfig(ctx, 'without-token');

    const result = await ctx.runner.run(['tm', 'list', '-T', ctx.env.token as string]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(defaultTmName(ctx));
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.tmx)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.csv)');
    expect(result.stdout).toContain('Created in Crowdin CLI (simple-tm.xlsx)');
    // No snapshot, for the same reason as the listing test above: `tm list` covers the whole
    // account, so its output moves with every other project and user on it.
  });
});
