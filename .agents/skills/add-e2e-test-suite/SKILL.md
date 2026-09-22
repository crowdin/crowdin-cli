---
name: add-e2e-test-suite
description: Adds a new end-to-end (e2e) test suite for the Crowdin CLI under tests/e2e/suites/, exercising real CLI commands against a freshly-created Crowdin project. Covers fixtures, the setupSuite/teardownSuite lifecycle, running the CLI, output normalization, snapshot generation, and file assertions. Use whenever asked to add, write, scaffold, or extend an e2e/integration test suite for the CLI — including new command coverage like upload, download, branch, glossary, or TM — even if the user just says "add an e2e test for X".
---

# Add an e2e test suite (Crowdin CLI)

The framework runs `bun src-next/cli.ts` against a **real, freshly-created Crowdin project**, asserts on normalized output / exit codes / produced files, then tears everything down. Each suite is one file owning one project: `beforeAll` provisions, `test()`s run **in declaration order**, `afterAll` tears down. See [tests/e2e/README.md](../../../tests/e2e/README.md).

## Iron rule: generate snapshots from a real run, never hand-write them

You can't reliably predict the CLI's exact output or where the server lands files — hand-written snapshots are usually wrong and waste a review cycle.

**You almost certainly don't have `CROWDIN_E2E_TOKEN`** (it lives in the user's/CI env). So don't run the suite yourself with a fabricated token. Instead, write the suite, then **ask the user to run it and report back**:

```bash
# user runs this (token already in their env):
bun test tests/e2e/suites/<suite>.test.ts --update-snapshots
```

Then read the committed `.snap` to sanity-check it's real output, not an error/empty build.

Same for any server behavior (locale folder names, file layout): **observe it, don't assume.** Ask the user to run once with a throwaway `console.log(await (await import('node:fs/promises')).readdir(ctx.workspace, { recursive: true }))` after the run (or `CROWDIN_E2E_KEEP=1 bun run test:e2e`, which skips teardown and logs the kept workspace path), and paste the result.

## Steps

**1. Fixtures** — `tests/e2e/fixtures/<suite>/config/crowdin.yml` (template) + input files (e.g. `sources/*.md`). `{{projectId}}` / `{{token}}` / `{{baseUrl}}` are always available (`{{baseUrl}}` is `CROWDIN_E2E_BASE_URL`, so never hardcode `api.crowdin.com`); any other `{{name}}` must be supplied by the caller (see `switchConfig` below) or `renderConfig` throws. Everything except the top-level `config/` dir is copied into the workspace, so `alt-configs/` and `expected/` land there too.

```yaml
project_id: "{{projectId}}"
api_token: "{{token}}"
base_path: "."
base_url: "{{baseUrl}}"
preserve_hierarchy: true
files:
  - source: "sources/*.md"
    translation: "translations/%locale%/%original_file_name%"
```

**2. Suite** — `tests/e2e/suites/<suite>.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { expectFailure } from '../helpers/cli.ts';
import { expectFilesExist } from '../helpers/files.ts';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('<human-readable suite name>', () => {
  let ctx: SuiteContext;

  // targetLanguageIds optional (defaults to ['it', 'uk']).
  beforeAll(async () => { ctx = await setupSuite('<suite>', { targetLanguageIds: ['uk', 'it'] }); });
  afterAll(async () => { await teardownSuite(ctx); });

  test('uploads sources', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);
    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations', async () => {
    const result = await ctx.runner.run(['download', 'translations']);
    expect(result).toMatchObject({ exitCode: 0 });
    expect(normalize(result.stdout)).toMatchSnapshot();
    // Files land where the config's `translation:` pattern resolves — assert the layout you observed.
    await expectFilesExist(ctx.workspace, 'translations/it-IT/alpha.md', 'translations/uk-UA/alpha.md');
  });

  test('rejects an unknown language', async () => {
    const result = await ctx.runner.run(['download', 'translations', '-l', 'xx']);
    expectFailure(result, 1, "Language 'xx' doesn't exist in the project");
  });
});
```

**3. Have the user run** the suite with `--update-snapshots` (see iron rule), then read the generated `.snap` before committing it.

No registry to edit (suites are discovered by file). No file cleanup to write (`teardownSuite` wipes the whole workspace).

## Rules learned the hard way

- **Tests share one project, run top-to-bottom.** Order them so later tests build on earlier state (upload before download). No isolation between tests.
- **`ctx.runner.run(args)` auto-appends `-c <config> --no-progress --no-colors`** — pass only what follows `crowdin`. Returns `{ stdout, stderr, exitCode, timedOut }`. Always assert the exit code *and* the snapshot.
- **Assert exit codes one way:** success is `expect(result).toMatchObject({ exitCode: 0 })`; a failing command is `expectFailure(result, <code>, ...stderrSubstrings)`. Don't reintroduce `expect(result.exitCode).toBe(...)`.
- **`normalize()` gathers every status line** (`●`, `▲`, `◆`) into one block, markers in order of first appearance and sorted within each — their interleaving is a race, so position is not preserved. Other lines are still sorted only within contiguous same-token runs (which keeps table rows inside their own table). It also masks ids (`#123` → `#id`, a bare leading id → `<id>`, `(ID: 123)` → `(ID: <project>)`), durations, the workspace root, the per-run project name, collapses repeated poll-progress lines, and drops the update-check banner. Assert load-bearing facts (exit code, files, counts) explicitly; don't add per-suite normalize config.
- **The config `translation:` pattern IS applied on `download`** — the CLI resolves each archive entry to the local path that pattern names, so `translation: "translations/%locale%/%original_file_name%"` lands `translations/it-IT/alpha.md` (see `basic-upload-download`). The layout follows the pattern and its placeholders, so assert what you observed for the pattern under test.
- **Snapshot keys embed the `describe()` name** — renaming it orphans existing entries; update the `.snap` or regenerate.
- **Prefer literal assertion strings** (`'translations/it-IT/alpha.md'`) over paths derived from the API/config — clearer and obviously correct.
- **Token required.** `setupSuite` throws without `CROWDIN_E2E_TOKEN`. Suites run via `bun run test:e2e`; the network-free helper unit tests run in the regular `bun test`.
- **Suites run four at a time** (`test:e2e` passes `--parallel=4`). Tests inside one file still run in order, but another suite is running against the same account — so never assert on account-wide listings (every glossary, every project) without filtering to this suite's own names.

## Helpers (`tests/e2e/helpers/`)

**Lifecycle (`suite.ts`)**

- `setupSuite(suite, { sourceLanguageId?, targetLanguageIds?, stringsBased?, withoutProject? })` → `SuiteContext { suite, env, client, workspace, project, runner, extraProjects }`. Provisions workspace + fixtures + project + rendered config; rolls back the project if a later setup step fails. `ctx.client` is a `@crowdin/crowdin-api-client` `Client` for direct API setup/assertions.
- `teardownSuite(ctx)` — deletes the project *and every `createExtraProject` one*, removes the workspace; honors `CROWDIN_E2E_KEEP=1`; logs, never throws.
- `createExtraProject(ctx, opts)` → id of a second project (e.g. a strings-based one to fire a guard against); torn down with the rest. Don't hand-roll a delete in `afterAll`.
- `switchConfig(ctx, name, vars?)` — swap in `alt-configs/<name>.yml`, rendered with the project id, token and any `vars`. Values go in as-is when they are strings and JSON-encoded otherwise, so an array renders as a YAML flow sequence: `switchConfig(ctx, 'ignore', { ignore: ['/**/?.xml'] })` against a template line `ignore: {{ignore}}`. Prefer this over building YAML from string arrays in the test.
- `restoreConfig(ctx)` — put the suite's own `config/crowdin.yml` back. Don't add an alt-config that just duplicates it.
- `renderFixture(ctx, from, to?, vars?)` — render any workspace fixture, not just `crowdin.yml` (e.g. an `--identity` file).
- `runJson<T>(ctx, args, opts?)` — run with `--output json`, assert exit 0, return the parsed stdout.

**Assertions**

- `expectFailure(result, exitCode, ...stderrSubstrings)` (`cli.ts`).
- `files.ts`: `expectFilesExist(workspace, ...paths)`, `expectFilesMatch(workspace, actualDir, expectedDir, ...paths)` (compares a download against `expected/` fixtures and names every file that differs), `clearDir(workspace, ...paths)` (clear a download destination so a stale file can't masquerade as a fresh one), `captureAndClear` / `expectRestored` / `capturedContent`, `listFilesRecursively(root)`.
- `lookup.ts`: `projectFilePaths(ctx)`, `findStringId`, `findBranch`, `findFileId`, `findCommentId`, `findGlossaryId`, `findTmId`, `translationCount`. Reach for these before writing another list-find-or-throw by hand.
- `normalize(output)` — see the rules above.

**Compare against fixtures, not against the CLI's own code.** `init` used to build its expected YAML with the CLI's own generator, so a generator regression rewrote both sides and passed. Check in an `expected/` file captured from a real run instead.
