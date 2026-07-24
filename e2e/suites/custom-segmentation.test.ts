import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { writeConfig } from '../helpers/config.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

/**
 * Overwrites the workspace's `rules/sample.srx.xml` — the file the fixture's `crowdin.yml`
 * `custom_segmentation` points to — with one of the static `rules/<variant>.srx.xml` fixtures.
 * Mirrors the PHP suite's `copy(self::file('rules/<variant>.srx.xml'), self::tmp('rules/sample.srx.xml'))`
 * between test methods.
 */
async function useSrxRules(ctx: SuiteContext, variant: string): Promise<void> {
  const content = await Bun.file(join(ctx.workspace, 'rules', `${variant}.srx.xml`)).text();
  await Bun.write(join(ctx.workspace, 'rules', 'sample.srx.xml'), content);
}

/**
 * Switches the workspace's active `crowdin.yml` to the `alt-configs/crowdin-rev2.yml` template
 * (copied into the workspace verbatim since only the fixture's top-level `config/` dir is rendered
 * by `setupSuite`). Mirrors the PHP suite's `self::prepareConfig([], self::file('config/crowdin-rev2.yml'))`.
 */
async function switchToDestConfig(ctx: SuiteContext): Promise<void> {
  const template = await Bun.file(join(ctx.workspace, 'alt-configs', 'crowdin-rev2.yml')).text();
  await writeConfig(ctx.workspace, template, { projectId: ctx.project.id, token: ctx.env.token as string });
}

describe('custom segmentation', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('custom-segmentation', { targetLanguageIds: ['it', 'uk'] });

    // Distractor mirroring the PHP suite's setup comment ("CLI3 should ignore these settings when
    // importing new files"): project-level docx file format settings that contradict what the CLI's
    // own config specifies (contentSegmentation: true / no srxStorageId here). buildImportOptions
    // (lib/upload/fileOptions.ts) only ever reads `content_segmentation`/`custom_segmentation` from
    // the CLI's own crowdin.yml per file, never from this project-level default, so it must have no
    // effect on the upload behavior asserted below.
    await ctx.client.projectsGroupsApi.addProjectFileFormatSettings(ctx.project.id, {
      format: 'docx',
      settings: {
        cleanTagsAggressively: false,
        contentSegmentation: true,
        importHiddenSlides: false,
        importNotes: false,
        translateHiddenRowsAndColumns: false,
        translateHiddenText: false,
        translateHyperlinkUrls: false,
      },
    });
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('rejects an invalid SRX file for every source file', async () => {
    await useSrxRules(ctx, 'invalid');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(1);
    // The "sources" directory is created before the per-file srxStorageId is validated by the API,
    // so it still succeeds even though both file creations below fail.
    expect(result.stdout).toContain('Directory sources created');
    // The Crowdin API's own validation error text (unrelated to the CLI rewrite), wrapped by
    // FileService.createProjectFile's `Failed to create file <name>. <api message>`. Confirmed via a
    // live run 2026-07-21 — not guessed.
    expect(result.stdout).toContain(
      'Failed to create file sample.docx. Invalid SRX specified. XML validation module returned: attributes construct error',
    );
    expect(result.stdout).toContain(
      'Failed to create file strings.xml. Invalid SRX specified. XML validation module returned: attributes construct error',
    );
    expect(result.stdout).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an SRX file with an invalid regular expression', async () => {
    await useSrxRules(ctx, 'invalid-regexp');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(1);
    // Unlike the previous test, the "sources" directory already exists on the project from the
    // first (failed) attempt above, so no new directory-created line is emitted this time.
    expect(result.stdout).not.toContain('Directory sources created');
    // Confirmed via a live run 2026-07-21 — not guessed.
    expect(result.stdout).toContain(
      'Failed to create file sample.docx. Invalid SRX specified. Invalid regular expression `/^.*[$/`',
    );
    expect(result.stdout).toContain(
      'Failed to create file strings.xml. Invalid SRX specified. Invalid regular expression `/^.*[$/`',
    );
    expect(result.stdout).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources once a valid SRX file is supplied', async () => {
    await useSrxRules(ctx, 'valid');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/sample.docx'");
    expect(result.stdout).toContain("File 'sources/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates sources after the SRX rules change', async () => {
    await useSrxRules(ctx, 'sampleV2');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/sample.docx'");
    expect(result.stdout).toContain("File 'sources/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('uploads sources to a dest path and reflects the earlier SRX rules update on the original docx', async () => {
    await switchToDestConfig(ctx);

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Directory Folder created');
    // Success messages always echo the LOCAL file path, never the dest-resolved project path —
    // confirmed by grep of UploadSourcesCommand.ts's create-branch `output.success` call.
    expect(result.stdout).toContain("File 'sources/sample.docx'");
    expect(result.stdout).toContain("File 'sources/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // CONFIRMED BUG (2026-07-21, see crowdin-cli-known-bugs memory): fileLookup (lib/upload/fileLookup.ts)
    // can't match an existing project file across a directory change, only an extension change — so
    // switching `dest` into a new directory for an already-uploaded file makes UploadSourcesCommand take
    // the CREATE branch instead of UPDATE, producing a DUPLICATE file at the new dest path while the
    // original is left behind untouched. Confirmed live via a standalone minimal repro (same code path,
    // no SRX involved) at /Users/vasyl.khomko/crowdin/tests/cli/dest-existing-file-bug/ — project ended up
    // with both /sources/sample.xml (id 34998) and /Folder/sample.xml (id 35002) for what should have been
    // one file relocated in place; this exact suite/fixture combination hasn't been separately live-run yet
    // but exercises the identical code path, so the same duplication is expected here. The PHP original
    // this suite was ported from asserts the file is still reachable at the OLD path after the same `dest`
    // switch (Java/PHP's own matching is more lenient), so this assertion encodes that Java-parity
    // expectation — exactly one `sample.docx` project-wide — and is LEFT RED as a regression marker per the
    // established Bug 3/4 precedent. Do not weaken this assertion to match the buggy duplicate-creation
    // behavior.
    const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
    const docxMatches = files.data.filter((file) => file.data.name === 'sample.docx');
    expect(docxMatches.length).toBe(1);

    // Confirms the previous test's sampleV2 SRX rules (break="no" on sentence-ending punctuation)
    // actually took effect on the original file: the two sentences merge into a single segment,
    // instead of the two segments sample.srx.xml (v1) would have produced. Checked at the OLD path since,
    // per the bug above, that file is never touched by this test's upload call — its content still reflects
    // whatever the previous ('updates sources after the SRX rules change') test left it with.
    const sourceDocx = files.data.find((file) => file.data.path === '/sources/sample.docx');
    expect(sourceDocx).toBeDefined();

    const strings = await ctx.client.sourceStringsApi.listProjectStrings(ctx.project.id, {
      fileId: sourceDocx?.data.id,
    });
    expect(strings.data.map((entry) => entry.data.text)).toEqual([
      'The U.K. Prime Minister, Mr. Blair, was seen out with his family today. Boris Johnson also was there.',
    ]);
  });
});
