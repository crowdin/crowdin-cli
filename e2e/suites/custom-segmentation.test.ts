import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, switchConfig, teardownSuite } from '../helpers/suite.ts';

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
    expect(result.stdout).toContain("Directory 'sources'");
    // The Crowdin API's own validation error text (unrelated to the CLI rewrite), wrapped by
    // FileService.createProjectFile's `Failed to create file <name>. <api message>`. Confirmed via a
    // live run 2026-07-21 — not guessed.
    expect(result.stderr).toContain(
      "Failed to create file 'sample.docx'. Key: importOptions. Message: Invalid SRX specified. XML validation module returned: attributes construct error",
    );
    expect(result.stderr).toContain(
      "Failed to create file 'strings.xml'. Key: importOptions. Message: Invalid SRX specified. XML validation module returned: attributes construct error",
    );
    expect(result.stderr).toContain('Current execution finished with errors');
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('rejects an SRX file with an invalid regular expression', async () => {
    await useSrxRules(ctx, 'invalid-regexp');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(1);
    // Unlike the previous test, the "sources" directory already exists on the project from the
    // first (failed) attempt above, so no new directory-created line is emitted this time.
    expect(result.stdout).not.toContain("Directory 'sources'");
    // Confirmed via a live run 2026-07-21 — not guessed.
    expect(result.stderr).toContain(
      "Failed to create file 'sample.docx'. Key: importOptions. Message: Invalid SRX specified. Invalid regular expression `/^.*[$/`",
    );
    expect(result.stderr).toContain(
      "Failed to create file 'strings.xml'. Key: importOptions. Message: Invalid SRX specified. Invalid regular expression `/^.*[$/`",
    );
    expect(result.stderr).toContain('Current execution finished with errors');
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
    await switchConfig(ctx, 'crowdin-rev2');

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Directory 'Folder'");
    // Success messages echo the PROJECT path, so the `dest` remapping shows up here directly:
    // `/sources/sample.docx` is uploaded as `Folder/sample.docx`.
    expect(result.stdout).toContain("File 'Folder/sample.docx'");
    expect(result.stdout).toContain("File 'Folder/strings.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();

    // Switching `dest` to a new directory does not relocate the file. `fileLookup` (lib/upload/fileLookup.ts)
    // matches an existing project file only by exact path or by a differing final extension, so any directory
    // (or filename) change misses and `UploadSourcesCommand` takes the CREATE branch: the file appears at the
    // new project path with no translations while the original stays behind holding all of its. Java v4's
    // `ProjectFilesUtils.fileLookup` is logically identical, so this is a pre-existing product wart rather
    // than a port regression — asserted here as what actually happens, since a test cannot fix it. The only
    // cleanup today is `--delete-obsolete`, which deletes the orphan rather than moving it.
    const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
    const docxPaths = files.data
      .filter((file) => file.data.name === 'sample.docx')
      .map((file) => file.data.path)
      .sort();

    expect(docxPaths).toEqual(['/Folder/sample.docx', '/sources/sample.docx']);

    // Confirms the previous test's sampleV2 SRX rules (break="no" on sentence-ending punctuation)
    // actually took effect on the original file: the two sentences merge into a single segment,
    // instead of the two segments sample.srx.xml (v1) would have produced. Checked at the OLD path since,
    // as established above, that file is never touched by this test's upload call — its content still reflects
    // whatever the previous ('updates sources after the SRX rules change') test left it with.
    const sourceDocx = files.data.find((file) => file.data.path === '/sources/sample.docx');
    expect(sourceDocx).toBeDefined();

    const strings = await ctx.client.sourceStringsApi.listProjectStrings(ctx.project.id, {
      fileId: sourceDocx?.data.id,
    });
    // The fixture's `<w:t>` runs separate the sentences with a NON-BREAKING space (U+00A0), which is what
    // Word writes after an abbreviation - spelled as an escape here because it is indistinguishable from a
    // plain space on screen, and a mismatch between the two renders as two identical-looking strings in the
    // failure diff. It is also why sampleV2's `break="no"` rule has something to bind here at all.
    expect(strings.data.map((entry) => entry.data.text)).toEqual([
      'The U.K.\u00A0Prime Minister, Mr. Blair, was seen out with his family today.\u00A0Boris Johnson also was there.',
    ]);
  });
});
