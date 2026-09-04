import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Covers `context download` / `upload` / `reset` / `status`
 * (`cli/commands/context/ContextCommand.ts`).
 *
 * No AI service is involved: the "AI context" is just a marker-delimited section of a string's
 * context field (`cli/utils/aiContext.ts`), so the suite writes the `ai_context` values into the
 * downloaded JSONL itself and walks the full round trip. The invariant every step guards is the
 * split between the two sections - manual context must survive an upload and a reset.
 */
const MANUAL_CONTEXT = 'Shown on the login screen';
const AI_CONTEXT_PREFIX = 'Generated context for ';

interface ContextRecord {
  id: number;
  key: string;
  text: string;
  file: string;
  context: string;
  ai_context: string;
}

interface ContextStats {
  total: number;
  withAi: number;
  withAiPercentage: string;
  withoutAi: number;
  withManual: number;
}

describe('context', () => {
  let ctx: SuiteContext;
  let welcomeStringId: number;
  let logoutStringId: number;
  let checkoutStringId: number;

  beforeAll(async () => {
    ctx = await setupSuite('context');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  function workspacePath(relativePath: string): string {
    return join(ctx.workspace, relativePath);
  }

  async function readRecords(relativePath: string): Promise<ContextRecord[]> {
    const content = await Bun.file(workspacePath(relativePath)).text();

    return content
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as ContextRecord);
  }

  async function writeRecords(relativePath: string, records: ContextRecord[]): Promise<void> {
    await Bun.write(workspacePath(relativePath), records.map((record) => JSON.stringify(record)).join('\n'));
  }

  async function readStats(args: string[] = []): Promise<ContextStats> {
    const result = await ctx.runner.run(['context', 'status', '--output', 'json', ...args]);

    expect(result.exitCode).toBe(0);

    return JSON.parse(result.stdout) as ContextStats;
  }

  /** The status title carries the project id, which is new on every run. */
  function maskProjectId(output: string): string {
    return output.replace(/\(ID: \d+\)/g, '(ID: <project>)');
  }

  async function findStringId(text: string): Promise<number> {
    const response = await ctx.client.sourceStringsApi
      .withFetchAll()
      .listProjectStrings(ctx.project.id, { filter: text });
    const match = response.data.find((entry) => entry.data.text === text);

    if (!match) {
      throw new Error(`String '${text}' not found via the API`);
    }

    return match.data.id;
  }

  test('prints help when invoked without a subcommand', async () => {
    const result = await ctx.runner.run(['context']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Manage strings context');
    expect(result.stdout).toContain('download');
    expect(result.stdout).toContain('upload');
    expect(result.stdout).toContain('reset');
    expect(result.stdout).toContain('status');
  });

  test('rejects an unknown subcommand', async () => {
    const result = await ctx.runner.run(['context', 'bogus']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("unknown command 'bogus'");
  });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'app.xml'");
    expect(result.stdout).toContain("File 'web.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    welcomeStringId = await findStringId('Welcome aboard');
    logoutStringId = await findStringId('Log out');
    checkoutStringId = await findStringId('Proceed to checkout');
  });

  // Crowdin derives a context of its own for every string it imports from an XML resource, so the
  // project is never context-free. The suite sets a known baseline instead: one manual context, two
  // strings with none, no AI context anywhere.
  test('seeds a known baseline context', async () => {
    for (const [id, context] of [
      [welcomeStringId, MANUAL_CONTEXT],
      [logoutStringId, ''],
      [checkoutStringId, ''],
    ] as const) {
      const edit = await ctx.runner.run(['string', 'edit', String(id), '--context', context]);

      expect(edit.exitCode).toBe(0);
    }

    const stats = await readStats();

    expect(stats.total).toBe(3);
    expect(stats.withAi).toBe(0);
    expect(stats.withManual).toBe(1);
    expect(stats.withAiPercentage).toBe('0.00');
  });

  test('reports the coverage as a table', async () => {
    const result = await ctx.runner.run(['context', 'status']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Context Status for Project');
    expect(maskProjectId(normalize(result.stdout))).toMatchSnapshot();
  });

  test('rejects an unsupported --status value', async () => {
    const result = await ctx.runner.run(['context', 'download', '--status', 'partial']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--status' parameter has an invalid value");
  });

  test('rejects a malformed --since value', async () => {
    const result = await ctx.runner.run(['context', 'status', '--since', '2026/01/01']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--since' parameter should be in 'YYYY-MM-DD' format");
  });

  test('rejects a calendar-invalid --since date', async () => {
    const result = await ctx.runner.run(['context', 'status', '--since', '2026-02-30']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--since' parameter should be in 'YYYY-MM-DD' format");
  });

  test('downloads every string to the default context file', async () => {
    const result = await ctx.runner.run(['context', 'download']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Downloaded 3 strings');
    expect(result.stdout).toContain("'crowdin-context.jsonl' saved successfully");
    expect(normalize(result.stdout)).toMatchSnapshot();

    const records = await readRecords('crowdin-context.jsonl');

    expect(records).toHaveLength(3);
    expect(records.map((record) => record.key).sort()).toEqual(['checkout', 'logout', 'welcome']);
    expect(records.map((record) => record.file).sort()).toEqual(['/app.xml', '/app.xml', '/web.xml']);
    expect(records.every((record) => record.ai_context === '')).toBe(true);

    const welcome = records.find((record) => record.id === welcomeStringId);

    expect(welcome?.context).toBe(MANUAL_CONTEXT);
  });

  test('downloads only strings without any context under --status empty', async () => {
    const result = await ctx.runner.run(['context', 'download', '--status', 'empty', '--to', 'empty.jsonl']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Downloaded 2 strings');

    const records = await readRecords('empty.jsonl');

    expect(records.map((record) => record.key).sort()).toEqual(['checkout', 'logout']);
  });

  test('downloads only manually annotated strings under --status manual', async () => {
    const result = await ctx.runner.run(['context', 'download', '--status', 'manual', '--to', 'manual.jsonl']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Downloaded 1 strings');

    const records = await readRecords('manual.jsonl');

    expect(records.map((record) => record.key)).toEqual(['welcome']);
  });

  test('writes nothing when --status ai matches no string', async () => {
    const result = await ctx.runner.run(['context', 'download', '--status', 'ai', '--to', 'ai.jsonl']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No strings found');
    expect(await Bun.file(workspacePath('ai.jsonl')).exists()).toBe(false);
  });

  test('downloads only the strings of a filtered file', async () => {
    const result = await ctx.runner.run(['context', 'download', '--file', '/app.xml', '--to', 'app.jsonl']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Downloaded 2 strings');

    const records = await readRecords('app.jsonl');

    expect(records.map((record) => record.key).sort()).toEqual(['logout', 'welcome']);
  });

  // The download rewrites --to wholesale, so a target holding anything else has to stop the run.
  test('refuses to overwrite a file that is not a context file', async () => {
    const result = await ctx.runner.run(['context', 'download', '--to', 'sources/app.xml']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('is not a context file');
    expect(await Bun.file(workspacePath('sources/app.xml')).text()).toContain('Welcome aboard');
  });

  test('fails to upload a context file that does not exist', async () => {
    const result = await ctx.runner.run(['context', 'upload', '--from', 'missing.jsonl']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("File 'missing.jsonl' not found in the Crowdin project");
  });

  test('uploads nothing while every ai_context is empty', async () => {
    const result = await ctx.runner.run(['context', 'upload']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No strings with AI context found in 'crowdin-context.jsonl'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('reports the pending changes under --dryrun without applying them', async () => {
    const records = await readRecords('crowdin-context.jsonl');

    await writeRecords(
      'crowdin-context.jsonl',
      records.map((record) => ({ ...record, ai_context: `${AI_CONTEXT_PREFIX}${record.key}` })),
    );

    const result = await ctx.runner.run(['context', 'upload', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('would be uploaded');

    // Every record's context spans several lines (the AI section sits below the manual one behind
    // its markers), so the three listings interleave into an order `normalize` cannot sort - this
    // is the one output in the suite that can't be snapshotted.
    for (const key of ['welcome', 'logout', 'checkout']) {
      expect(result.stdout).toContain(`${AI_CONTEXT_PREFIX}${key}`);
    }

    const stats = await readStats();

    expect(stats.withAi).toBe(0);
  });

  test('uploads the AI context', async () => {
    const result = await ctx.runner.run(['context', 'upload']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Updated strings 3/3');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const stats = await readStats();

    expect(stats.withAi).toBe(3);
    expect(stats.withoutAi).toBe(0);
    expect(stats.withAiPercentage).toBe('100.00');
  });

  // The upload writes both sections into one context field; the manual half has to come back out
  // of it untouched, which is the whole point of the marker split.
  test('keeps the manual context alongside the uploaded AI context', async () => {
    const result = await ctx.runner.run(['context', 'download', '--to', 'round-trip.jsonl']);

    expect(result.exitCode).toBe(0);

    const records = await readRecords('round-trip.jsonl');
    const welcome = records.find((record) => record.id === welcomeStringId);

    expect(welcome?.context).toBe(MANUAL_CONTEXT);
    expect(welcome?.ai_context).toBe(`${AI_CONTEXT_PREFIX}welcome`);
  });

  test('rejects a context file with an unparsable line', async () => {
    const records = await readRecords('crowdin-context.jsonl');

    await Bun.write(
      workspacePath('broken.jsonl'),
      [JSON.stringify(records[0]), 'not a json line', JSON.stringify(records[1])].join('\n'),
    );

    const result = await ctx.runner.run(['context', 'upload', '--from', 'broken.jsonl']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('contains an invalid record at line 2');
  });

  test('breaks the coverage down per file', async () => {
    const result = await ctx.runner.run(['context', 'status', '--by-file']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('/app.xml');
    expect(result.stdout).toContain('/web.xml');
    expect(maskProjectId(normalize(result.stdout))).toMatchSnapshot();
  });

  test('breaks the coverage down per file in the plain output', async () => {
    const result = await ctx.runner.run(['context', 'status', '--by-file', '--output', 'plain']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('With AI context:');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('requires --all when resetting without any filter', async () => {
    const result = await ctx.runner.run(['context', 'reset']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("The '--all' parameter should be specified explicitly if no other filter");
  });

  test('reports the strings a filtered reset would clear under --dryrun', async () => {
    const result = await ctx.runner.run(['context', 'reset', '--file', '/web.xml', '--dryrun']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('would be updated');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const stats = await readStats();

    expect(stats.withAi).toBe(3);
  });

  test('clears the AI context of a filtered file only', async () => {
    const result = await ctx.runner.run(['context', 'reset', '--file', '/web.xml']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Updated strings 1/1');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const stats = await readStats();

    expect(stats.withAi).toBe(2);
  });

  test('clears every remaining AI context under --all, keeping the manual context', async () => {
    const result = await ctx.runner.run(['context', 'reset', '--all']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Updated strings 2/2');
    expect(normalize(result.stdout)).toMatchSnapshot();

    const stats = await readStats();

    expect(stats.withAi).toBe(0);
    expect(stats.withManual).toBe(1);
  });

  test('reports nothing to reset once no AI context is left', async () => {
    const result = await ctx.runner.run(['context', 'reset', '--all']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No strings found');
  });
});
