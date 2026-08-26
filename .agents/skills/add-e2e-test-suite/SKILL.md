---
name: add-e2e-test-suite
description: Adds a new end-to-end (e2e) test suite for the Crowdin CLI under e2e/suites/, exercising real CLI commands against a freshly-created Crowdin project. Covers fixtures, the setupSuite/teardownSuite lifecycle, running the CLI, output normalization, snapshot generation, and file assertions. Use whenever asked to add, write, scaffold, or extend an e2e/integration test suite for the CLI — including new command coverage like upload, download, branch, glossary, or TM — even if the user just says "add an e2e test for X".
---

# Add an e2e test suite (Crowdin CLI)

The framework runs `bun src-next/cli.ts` against a **real, freshly-created Crowdin project**, asserts on normalized output / exit codes / produced files, then tears everything down. Each suite is one file owning one project: `beforeAll` provisions, `test()`s run **in declaration order**, `afterAll` tears down. See [e2e/README.md](../../../e2e/README.md).

## Iron rule: generate snapshots from a real run, never hand-write them

You can't reliably predict the CLI's exact output or where the server lands files — hand-written snapshots are usually wrong and waste a review cycle.

**You almost certainly don't have `CROWDIN_E2E_TOKEN`** (it lives in the user's/CI env). So don't run the suite yourself with a fabricated token. Instead, write the suite, then **ask the user to run it and report back**:

```bash
# user runs this (token already in their env):
bun test e2e/suites/<suite>.test.ts --update-snapshots
```

Then read the committed `.snap` to sanity-check it's real output, not an error/empty build.

Same for any server behavior (locale folder names, file layout): **observe it, don't assume.** Ask the user to run once with a throwaway `console.log(await (await import('node:fs/promises')).readdir(ctx.workspace, { recursive: true }))` after the run (or `CROWDIN_E2E_KEEP=1 bun run test:e2e`, which skips teardown and logs the kept workspace path), and paste the result.

## Steps

**1. Fixtures** — `e2e/fixtures/<suite>/config/crowdin.yml` (template) + input files (e.g. `sources/*.md`). Use only `{{projectId}}` / `{{token}}` placeholders; `renderConfig` throws on any other `{{...}}`. Everything except the top-level `config/` dir is copied into the workspace.

```yaml
project_id: "{{projectId}}"
api_token: "{{token}}"
base_path: "."
base_url: "https://api.crowdin.com"
preserve_hierarchy: true
files:
  - source: "sources/*.md"
    translation: "translations/%locale%/%original_file_name%"
```

**2. Suite** — `e2e/suites/<suite>.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
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
    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('downloads translations', async () => {
    const result = await ctx.runner.run(['download', 'translations']);
    expect(result.exitCode).toBe(0);
    expect(normalize(result.stdout)).toMatchSnapshot();
    // Files land at <languageId>/<source path> — Crowdin's default build layout.
    await expectFilesExist(ctx.workspace, 'it/sources/alpha.md', 'uk/sources/alpha.md');
  });
});
```

**3. Have the user run** the suite with `--update-snapshots` (see iron rule), then read the generated `.snap` before committing it.

No registry to edit (suites are discovered by file). No file cleanup to write (`teardownSuite` wipes the whole workspace).

## Rules learned the hard way

- **Tests share one project, run top-to-bottom.** Order them so later tests build on earlier state (upload before download). No isolation between tests.
- **`ctx.runner.run(args)` auto-appends `-c <config> --no-progress --no-colors`** — pass only what follows `crowdin`. Returns `{ stdout, stderr, exitCode, timedOut }`. Always assert `exitCode` *and* the snapshot.
- **`normalize()` sorts lines only within contiguous same-marker runs** (`●` progress, `◆` results), not globally — so it doesn't guard ordering within a block. Assert load-bearing facts (exit code, files, counts) explicitly in the test; don't add per-suite normalize config.
- **The config `translation:` pattern is NOT applied on `download`** — the CLI extracts the raw build ZIP, so files land at `<languageId>/<original_path>` (e.g. `it/sources/alpha.md`), not `translations/it-IT/...`. Assert the layout you observed.
- **Snapshot keys embed the `describe()` name** — renaming it orphans existing entries; update the `.snap` or regenerate.
- **Prefer literal assertion strings** (`'it/sources/alpha.md'`) over paths derived from the API/config — clearer and obviously correct.
- **Token required.** `setupSuite` throws without `CROWDIN_E2E_TOKEN`. Suites run via `bun run test:e2e`; the network-free helper unit tests run in the regular `bun test`.

## Helpers (`e2e/helpers/`)

- `setupSuite(suite, { sourceLanguageId?, targetLanguageIds? })` → `SuiteContext { env, client, workspace, project, runner }`. Provisions workspace + fixtures + project + rendered config; rolls back the project if a later setup step fails. `ctx.client` is a `@crowdin/crowdin-api-client` `Client` for direct API setup/assertions.
- `teardownSuite(ctx)` — deletes project + removes workspace; honors `CROWDIN_E2E_KEEP=1`; logs, never throws.
- `ctx.runner.run(args, opts?)` → `{ stdout, stderr, exitCode, timedOut }`.
- `normalize(output)`, `expectFilesExist(workspace, ...relativePaths)`.
