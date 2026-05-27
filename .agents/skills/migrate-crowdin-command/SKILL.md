---
name: migrate-crowdin-command
description: Migrates a single command from the Java/picocli CLI (src/) to the Bun/TypeScript CLI (src-next/). Covers architecture mapping, option migration, action logic porting, DI wiring, output/error handling, test migration, and registration. Use when asked to migrate, port, or implement a CLI command in the TypeScript rewrite of Crowdin CLI.
---

# Migrate Crowdin CLI Command (Java → Bun/TS)

## Before starting — always read these files

They are the ground truth for current patterns; do not rely on memory or examples in this skill:

- `src-next/cli/types.ts` — `CommandDef`, `OptionDef`, `SubcommandDef` shapes
- `src-next/cli/commands.ts` — DI wiring and registration
- `src-next/cli/errors/CliError.ts` — error types
- A similar existing command for structural reference (e.g. `FileCommand.ts`, `StatusCommand.ts`)
- The Java `*Subcommand.java` and `*Action.java` for the command being ported
- The Java `*SubcommandTest.java` and `*ActionTest.java` for coverage reference

## Architecture mapping

| Java layer | TypeScript equivalent |
|---|---|
| `*Subcommand.java` (picocli) | `CommandDef` returned from `getDefinition()` |
| `@CommandLine.Option` annotations | `OptionDef` objects in `options/*.ts` |
| `*Action.java` | Arrow function methods on the command class |
| `Actions` factory / DI | Constructor factory functions (`getConfig`, `getOutput`, `getProjectService`, …) |
| `crowdin-api-client-java` | `@crowdin/crowdin-api-client` via `Client` wrapper |
| `console.print` / `LogUtil` | `Output` utilities (`output.table`, `output.success`) |
| Checked exceptions / exit codes | `CliError` / `toCliError` |

## Step-by-step migration

### 1. Catalog the Java command

From `*Subcommand.java`:
- Every `@CommandLine.Option` field: name, short flag, type, default, description
- The `getAction()` call — which `actions.*` method and which arguments

Preserve CLI contract parity with Java:
- Keep option names/flags and parameter descriptions the same as Java CLI unless there is a documented intentional global replacement.
- Keep user-facing texts aligned with Java CLI (success messages, error messages, validation messages, prompts, and table/header labels).

From `*Action.java`:
- Full business logic: API calls made, transformations, output printed, errors thrown
- Any dry-run or alternative code paths

### 2. Create the command class

Location: `src-next/cli/commands/<name>/<Name>Command.ts`

Structure to follow: read `FileCommand.ts` or `StatusCommand.ts` for the current class shape. Key rules:
- Action methods **must be arrow functions** so `this` is bound when Commander invokes them
- Constructor receives only factory functions — never instantiate services directly
- Inject only what the command actually needs

### 3. Create option files

Reuse shared options that already exist (check `src-next/cli/commands/*/options/`). For new options, add `src-next/cli/commands/<name>/options/<option>.ts`. For options used in only one place, inline the `OptionDef` in `getDefinition()`.

### 4. Port action logic

Map Java idioms:

| Java | TypeScript |
|---|---|
| `--plain` / `--no-progress` / `--verbose` | Already global options — skip |
| `--dry-run` | Add as per-command `OptionDef`; use `if (options.dryRun)` branch |
| Catch `CrowdinApiException` | `toCliError(error, 'fallback message')` |
| `throw ExitCodeException` | `throw new CliError(message, exitCode)` |
| `out.println(...)` | `output.success(...)` or `output.table(...)` |

Validate inputs before any API call; throw `CliError` for missing/invalid arguments.

### 5. Register in `commands.ts`

Add the new command instance and its `getDefinition()` call. Follow the existing pattern in `src-next/cli/commands.ts`.

### 6. Write tests

Location: `tests/cli/commands/<name>/<Name>Command.test.ts`

Read `tests/cli/commands/file/FileCommand.test.ts` for the current test structure. Coverage checklist (mirrors Java test scope):

- [ ] Happy path for each subcommand/action
- [ ] Each validation error (`CliError` thrown with correct message)
- [ ] API errors propagate via `toCliError`
- [ ] File system side effects verified via temp dir (`mkdtemp`) + `Bun.file`
- [ ] `mock.restore()` called in `afterEach`

## Option parity

Not all Java options need migrating. Intentional omissions:

| Java option | Reason to skip / TS equivalent |
|---|---|
| `--plain` | Covered by global `--format text` |
| `--no-progress` | Already a global option |
| `--verbose` / `-v` | Already a global option |

For all other options, preserve Java semantics exactly, including option names and descriptions. Document in a code comment if an option is intentionally deferred.

User-facing output parity also applies: keep command messages and wording consistent with Java CLI unless there is an explicit product decision to change them.

## Known nuances

- **`--branch`**: a shared option — reuse the existing `branch.ts` file, do not recreate it
- **`--fail-if-incomplete`** (`status`): not yet in TS; add when migrating that command
- **Dry-run**: Java uses a separate `listSources` action; TS uses an `if (options.dryRun)` branch in the same action method
- **`--cache`** (`upload sources`): check if already handled before adding
