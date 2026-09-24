import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decode } from '@toon-format/toon';
import { expectFailure } from '../helpers/cli.ts';
import { findStyleGuideId } from '../helpers/lookup.ts';
import { normalize } from '../helpers/normalize.ts';
import { runJson, type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/** Far outside the account's id range, so the API answers 404 rather than someone's guide. */
const MISSING_STYLE_GUIDE_ID = 999999999;

/** Leftovers from an interrupted run are swept once they are older than any run could still be. */
const STALE_AFTER_SECONDS = 60 * 60;

type ListedGuide = { id: number; name: string; isShared: boolean; updatedAt: string };

/**
 * Style guides belong to the account, not to the project, so `teardownSuite` cannot reach them. Every
 * guide this suite creates is named after its per-run project, which keeps parallel runs apart and
 * lets a later run recognise a leftover by the timestamp in the name.
 */
async function removeStyleGuides(ctx: SuiteContext, isOwned: (name: string) => boolean): Promise<void> {
  try {
    const response = await ctx.client.styleGuidesApi.withFetchAll().listStyleGuides();

    for (const entry of response.data) {
      if (isOwned(entry.data.name)) {
        await ctx.client.styleGuidesApi.deleteStyleGuide(entry.data.id);
      }
    }
  } catch (error) {
    console.warn(`Failed to clean up this suite's style guides: ${error}`);
  }
}

function isStaleLeftover(name: string): boolean {
  const createdAt = Number(/^e2e-(\d+)-style-guide/.exec(name)?.[1]);

  return Number.isFinite(createdAt) && Date.now() / 1000 - createdAt > STALE_AFTER_SECONDS;
}

describe('style-guide', () => {
  let ctx: SuiteContext;
  let assignedName: string;
  let assignedId: number;
  let unassignedName: string;
  let unassignedId: number;

  const suiteEntries = (rows: ListedGuide[]) =>
    rows
      .filter((row) => row.name === assignedName || row.name === unassignedName)
      .sort((a, b) => a.name.localeCompare(b.name));

  beforeAll(async () => {
    ctx = await setupSuite('style-guide');
    assignedName = `${ctx.project.name}-assigned`;
    // Created without --name, so the guide is named after this file's stem.
    unassignedName = ctx.project.name;
    await copyFile(
      join(ctx.workspace, 'sources/acme-style-guide.pdf'),
      join(ctx.workspace, `sources/${unassignedName}.pdf`),
    );
    await removeStyleGuides(ctx, isStaleLeftover);
  });

  afterAll(async () => {
    if (ctx && !ctx.env.keep) {
      await removeStyleGuides(ctx, (name) => name.startsWith(ctx.project.name));
    }

    await teardownSuite(ctx);
  });

  // `uploadAction` validates before it builds any service, so none of these reach the API.
  test('rejects a file that does not exist', async () => {
    const result = await ctx.runner.run(['style-guide', 'upload', 'sources/missing.md']);

    expectFailure(result, 1, "File 'sources/missing.md' not found");
  });

  test('rejects a directory', async () => {
    const result = await ctx.runner.run(['style-guide', 'upload', 'sources']);

    expectFailure(result, 1, 'The specified file is a directory');
  });

  test('rejects an unsupported file extension', async () => {
    const result = await ctx.runner.run(['style-guide', 'upload', 'sources/unsupported.txt']);

    expectFailure(result, 1, 'Supported formats: md, pdf, docx, xlsx');
  });

  test('rejects creation options together with --id', async () => {
    const result = await ctx.runner.run([
      'style-guide',
      'upload',
      'sources/acme-style-guide.md',
      '--id',
      '1',
      '--name',
      'x',
      '--language',
      'uk',
    ]);

    expectFailure(result, 2, "'--name', '--language' can't be used with '--id'");
  });

  test('rejects --shared together with --project', async () => {
    const result = await ctx.runner.run([
      'style-guide',
      'upload',
      'sources/acme-style-guide.md',
      '--shared',
      '--project',
      String(ctx.project.id),
    ]);

    expectFailure(result, 2, "'--shared' can't be used with '--project'");
  });

  test('rejects a non-numeric --id on upload', async () => {
    const result = await ctx.runner.run(['style-guide', 'upload', 'sources/acme-style-guide.md', '--id', 'abc']);

    expectFailure(result, 2, 'Style guide id must be numeric');
  });

  test('creates a style guide assigned to the project and a language', async () => {
    const result = await ctx.runner.run([
      'style-guide',
      'upload',
      'sources/acme-style-guide.md',
      '--name',
      assignedName,
      '--language',
      'uk',
      '--project',
      String(ctx.project.id),
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    assignedId = await findStyleGuideId(ctx, assignedName);
    const guide = (await ctx.client.styleGuidesApi.getStyleGuide(assignedId)).data;

    expect(guide.projectIds).toEqual([ctx.project.id]);
    expect(guide.languageIds).toEqual(['uk']);
    expect(guide.isShared).toBe(false);
  });

  test('creates a style guide named after the file when --name is omitted', async () => {
    const created = await runJson<ListedGuide>(ctx, ['style-guide', 'upload', `sources/${unassignedName}.pdf`]);

    expect(created.name).toBe(unassignedName);
    expect(created.isShared).toBe(false);

    unassignedId = created.id;
  });

  test('lists the created style guides', async () => {
    const result = await ctx.runner.run(['style-guide', 'list']);

    expect(result).toMatchObject({ exitCode: 0 });
    // No snapshot: the listing covers the whole account, so it moves between runs.
    expect(result.stdout).toContain(`#${assignedId} ${assignedName} (projects: 1)`);
    expect(result.stdout).toContain(`#${unassignedId} ${unassignedName} (projects: 0)`);
  });

  test('lists assignments in verbose text', async () => {
    const result = await ctx.runner.run(['style-guide', 'list', '--verbose']);

    expect(result).toMatchObject({ exitCode: 0 });
    // The AI instructions line is left out: Crowdin fills them in from the uploaded file on its own
    // schedule, so it reads 'no' or 'yes' depending on timing.
    expect(result.stdout).toContain(
      `#${assignedId} ${assignedName} (projects: 1)\n\tlanguages: uk\n\tprojects: ${ctx.project.id}\n\tAI instructions: `,
    );
  });

  test('serializes id, name, shared flag and update time in the json listing', async () => {
    const listed = suiteEntries(await runJson<ListedGuide[]>(ctx, ['style-guide', 'list']));

    expect(listed.map((guide) => guide.name)).toEqual([unassignedName, assignedName].sort());
    expect(listed.every((guide) => Object.keys(guide).join() === 'id,name,isShared,updatedAt')).toBe(true);
  });

  test('adds comma-joined project and language ids to the verbose json listing', async () => {
    const listed = await runJson<(ListedGuide & { projectIds: string; languageIds: string })[]>(ctx, [
      'style-guide',
      'list',
      '--verbose',
    ]);
    const assigned = listed.find((guide) => guide.id === assignedId);

    expect(assigned).toMatchObject({ projectIds: String(ctx.project.id), languageIds: 'uk' });
  });

  test('carries the same listing in the toon output', async () => {
    const json = await runJson<ListedGuide[]>(ctx, ['style-guide', 'list']);
    const toon = await ctx.runner.run(['style-guide', 'list', '--output', 'toon']);

    expect(toon).toMatchObject({ exitCode: 0 });
    // Two runs over an account-wide listing: a guide another run adds between them must not read as
    // a difference.
    expect(suiteEntries(decode(toon.stdout) as ListedGuide[])).toEqual(suiteEntries(json));
  });

  test('lists bare names in the plain output', async () => {
    const result = await ctx.runner.run(['style-guide', 'list', '--output', 'plain']);

    expect(result).toMatchObject({ exitCode: 0 });

    const names = result.stdout.split('\n');

    expect(names).toContain(assignedName);
    expect(names).toContain(unassignedName);
  });

  test('lists only the style guides assigned to the project with --assigned', async () => {
    const result = await ctx.runner.run(['style-guide', 'list', '--assigned']);

    expect(result).toMatchObject({ exitCode: 0 });
    // Shared guides elsewhere in the account count as assigned too, so no snapshot.
    expect(result.stdout).toContain(assignedName);
    expect(result.stdout).not.toContain(`${unassignedName} `);
  });

  test('rejects a non-numeric style guide id on download', async () => {
    const result = await ctx.runner.run(['style-guide', 'download', 'not-a-number']);

    expectFailure(result, 2, 'Style guide id must be numeric');
  });

  test('reports a style guide that does not exist', async () => {
    const result = await ctx.runner.run(['style-guide', 'download', String(MISSING_STYLE_GUIDE_ID)]);

    expectFailure(result, 102, 'Not Found');
  });

  test('downloads a style guide named after it, keeping the uploaded extension', async () => {
    const file = `${assignedName}.md`;

    const result = await ctx.runner.run(['style-guide', 'download', String(assignedId)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    expect(await Bun.file(join(ctx.workspace, file)).text()).toBe(
      await Bun.file(join(ctx.workspace, 'sources/acme-style-guide.md')).text(),
    );
  });

  test('downloads a PDF style guide to --to', async () => {
    const file = 'download/guide.pdf';

    const result = await ctx.runner.run(['style-guide', 'download', String(unassignedId), '--to', file]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.stdout).toContain(`'${file}' downloaded successfully`);
    expect(await Bun.file(join(ctx.workspace, file)).bytes()).toEqual(
      await Bun.file(join(ctx.workspace, 'sources/acme-style-guide.pdf')).bytes(),
    );
  });

  test('echoes the written path in the plain and json download output', async () => {
    const file = 'download/plain-output.md';
    const plain = await ctx.runner.run([
      'style-guide',
      'download',
      String(assignedId),
      '--to',
      file,
      '--output',
      'plain',
    ]);

    expect(plain).toMatchObject({ exitCode: 0 });
    expect(plain.stdout.trim()).toBe(file);

    expect(await runJson(ctx, ['style-guide', 'download', String(assignedId), '--to', file])).toBe(file);
  });

  test('replaces the file of an existing style guide with --id, keeping its name and assignments', async () => {
    const result = await ctx.runner.run([
      'style-guide',
      'upload',
      'sources/acme-style-guide.pdf',
      '--id',
      String(assignedId),
    ]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    const guide = (await ctx.client.styleGuidesApi.getStyleGuide(assignedId)).data;

    expect(guide.name).toBe(assignedName);
    expect(guide.projectIds).toEqual([ctx.project.id]);
    expect(guide.languageIds).toEqual(['uk']);
  });

  test('downloads the replaced file with its new extension', async () => {
    const file = `${assignedName}.pdf`;

    const result = await ctx.runner.run(['style-guide', 'download', String(assignedId)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(await Bun.file(join(ctx.workspace, file)).bytes()).toEqual(
      await Bun.file(join(ctx.workspace, 'sources/acme-style-guide.pdf')).bytes(),
    );
  });

  test('rejects a non-numeric style guide id on delete', async () => {
    const result = await ctx.runner.run(['style-guide', 'delete', 'not-a-number']);

    expectFailure(result, 2, 'Style guide id must be numeric');
  });

  test('deletes a style guide', async () => {
    const result = await ctx.runner.run(['style-guide', 'delete', String(unassignedId)]);

    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();

    const listed = await runJson<ListedGuide[]>(ctx, ['style-guide', 'list']);

    expect(listed.some((guide) => guide.id === unassignedId)).toBe(false);
  });

  test('reports a style guide that is already deleted', async () => {
    const result = await ctx.runner.run(['style-guide', 'delete', String(unassignedId)]);

    expectFailure(result, 102, 'Not Found');
  });
});
