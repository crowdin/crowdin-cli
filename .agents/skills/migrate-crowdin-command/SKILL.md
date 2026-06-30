---
name: migrate-crowdin-command
description: Migrates a single command from the Java/picocli CLI (src/) to the Bun/TypeScript CLI (src-next/). Covers architecture mapping, option migration, action logic porting, DI wiring, output/error handling, test migration, and registration. Use when asked to migrate, port, or implement a CLI command in the TypeScript rewrite of Crowdin CLI.
---

# Migrate Crowdin CLI Command (Java → Bun/TS)

## Migration policy defaults

Use these defaults for future migrations unless the user explicitly requests a different behavior:

1. **Strict parity default**
   - Preserve Java CLI behavior for command structure, argument validation, option semantics, success/error wording, and side effects.
   - Treat parity as required unless there is a documented intentional migration exception.
   - If behavior diverges intentionally, document it in the command code and tests.

2. **Architecture default**
   - Prefer a dedicated `src-next/cli/services/<Domain>Service.ts` for API interactions.
   - Keep command classes focused on CLI contract: definition, argument/option validation, output, and `CliError` handling.
   - Wire the service through `src-next/cli/services.ts` factory functions and inject via command constructor.

3. **Output mode default**
   - Do **not** port Java command-local output switches that are already covered globally.
   - Specifically, do **not** port Java `--plain`; use global `--format` (`text` / `json` / `toon`) as the output-mode switch.
   - Keep Java-intent row/message content while routing rendering through `Output`.

4. **Testing coverage default**
   - Mirror Java command test intent and include explicit coverage for:
     - happy path for every migrated subcommand/action
     - all validation errors and argument parsing failures
     - API/service error propagation (`toCliError` or explicit `CliError`)
     - parity-sensitive output/messages in text and structured formats as applicable
   - Do not consider migration complete without targeted command tests for each migrated subcommand.

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
| `@CommandLine.Option` annotations | named `OptionDef` consts in `<command>/options.ts` |
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
- Keep argument parsing and validation order aligned with Java where it affects user-visible behavior.

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

One rule, no exceptions: every command-specific option is a named `OptionDef` const in a single `src-next/cli/commands/<name>/options.ts`, imported into the command file. Never inline `OptionDef`s in `getDefinition()`, and never use one-file-per-option dirs.

Options shared by 2+ commands live in `src-next/cli/commands/common/options.ts` (e.g. `branch`, the config-tier primitives, and the `baseConfigGroup`/`projectConfigGroup`/`filesConfigGroup` groups); global options live in `src-next/cli/commands/global/options.ts`. Reuse these instead of redefining. If a command-body local would collide with an imported option name, alias on import (e.g. `import { source as sourceOption } from './options.ts'`).

### 4. Port action logic

Map Java idioms:

| Java | TypeScript |
|---|---|
| `--plain` / `--no-progress` / `--verbose` | Already global options — skip command-local flags and use global equivalents |
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
- [ ] Output/message parity assertions for text + structured formats when command renders output
- [ ] `mock.restore()` called in `afterEach`

## Option parity

Not all Java options need migrating. Intentional omissions:

| Java option | Reason to skip / TS equivalent |
|---|---|
| `--plain` | Covered by global `--format` (do not reintroduce command-local output flag) |
| `--no-progress` | Already a global option |
| `--verbose` / `-v` | Already a global option |

For all other options, preserve Java semantics exactly, including option names and descriptions. Document in a code comment if an option is intentionally deferred.

User-facing output parity also applies: keep command messages and wording consistent with Java CLI unless there is an explicit product decision to change them.
