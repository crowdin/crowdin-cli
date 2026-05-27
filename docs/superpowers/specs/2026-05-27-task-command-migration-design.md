# Task Command Migration Design (Java -> Bun/TS)

Date: 2026-05-27  
Scope: Migrate `task` command to `src-next` with subcommands `add` and `list` and full option parity.

## Goals

- Add `task` command to the TypeScript CLI with `task list` and `task add`.
- Keep behavior aligned with the original Java command.
- Preserve all current Java options for both subcommands.
- Keep architecture consistent with current `src-next` command/service patterns.

## Non-Goals

- Introducing new task features beyond existing Java command behavior.
- Changing command semantics (for example file matching rules or required option rules).
- Refactoring unrelated commands.

## Architecture

### Command Layer

Create `src-next/cli/commands/task/TaskCommand.ts`:

- Exposes `getDefinition()` for top-level `task` command.
- Defines subcommands:
  - `list`: list tasks with optional status/assignee filtering.
  - `add`: create a task with full Java option set.
- Keeps action methods as arrow functions (`defaultAction`, `listAction`, `addAction`).
- Handles:
  - input validation and option interaction checks
  - output shaping for normal/verbose modes
  - fallback messaging through shared CLI error mapping

### Options Layer

Create `src-next/cli/commands/task/options/*.ts` for task-specific options:

- `status`, `assigneeId` for `task list`
- `type`, `language`, `file`, `workflowStep`, `description`, `skipAssignedStrings`,
  `includePreTranslatedStringsOnly`, `label` for `task add`
- Reuse shared `branch` option where available

All option names, value types, and meanings follow Java parity.

### Service Layer

Create `src-next/cli/services/TaskService.ts`:

- Encapsulates task-related API calls and data preparation:
  - list tasks by optional status
  - resolve project files (with optional branch) and map file paths to file IDs
  - create task with enterprise/non-enterprise request shape
- Wraps API failures with `toCliError(...)` and command-specific fallback messages.

Update `src-next/cli/services.ts`:

- Add `GetTaskService` type.
- Add `createGetTaskService(getApiClient, getConfig, getProjectService?)` factory depending on final constructor needs.

### Registration Layer

Update `src-next/cli/commands.ts`:

- Instantiate `TaskCommand` with required factories.
- Add `taskCommand.getDefinition()` to exported `commands`.

Update `tests/cli/commands.test.ts`:

- Include `task` in expected top-level commands list.
- Verify key subcommands include `add` and `list`.

## Detailed Behavior

### `task list`

Inputs:

- `--status`
- `--assignee-id`

Validation:

- `status` must be a supported task status (case-insensitive input).
- `assignee-id` must be numeric.

Flow:

1. Fetch tasks from API with optional status filter.
2. If `assignee-id` is set, filter by assignee ID.
3. Render output rows.

Output:

- Non-empty:
  - default output: detailed row fields (`id`, `targetLanguage`, `title`, `status`, `words`, `deadline`)
  - verbose mode may include additional available fields
- Empty:
  - print empty-state success/info message

### `task add`

Inputs:

- positional: `title`
- options:
  - `--type`
  - `--language`
  - `--file` (repeatable)
  - `--branch`
  - `--workflow-step`
  - `--description`
  - `--skip-assigned-strings` (negatable)
  - `--include-pre-translated-strings-only` (negatable)
  - `--label` (repeatable)

Validation (Java parity):

- `title` is required.
- `language` is required.
- at least one `file` is required.
- Non-enterprise:
  - `type` is required
  - `type` must be `translate` or `proofread`
- Enterprise:
  - `workflow-step` is required
- Combination check:
  - reject `--type translate` when `--include-pre-translated-strings-only=true`

Flow:

1. Resolve project context using branch when provided.
2. Build path-to-file map and resolve file IDs for all input paths.
3. Warn on missing file paths.
4. Fail if zero valid file IDs remain.
5. Build request payload:
   - non-enterprise: standard create task request
   - enterprise: enterprise create task request with workflow step
6. Create task via API and print success output.

Output:

- Success: print created task summary with key fields.
- Failure: raise mapped CLI error with stable fallback message.

## Test Plan

Create `tests/cli/commands/task/TaskCommand.test.ts` with coverage for:

- registration and subcommand availability
- `task list`:
  - valid status flow
  - unsupported status validation error
  - assignee filtering behavior
  - empty list output
- `task add`:
  - missing required input validations
  - enterprise/non-enterprise conditional validations
  - invalid type validation
  - incompatible option combination validation
  - missing-file warnings and no-valid-files failure
  - request payload mapping for both project types
  - success output rendering
  - API error mapping

Also update `tests/cli/commands.test.ts` to include `task`.

## Acceptance Criteria

- `task` command is registered and visible in CLI command registry.
- `task list` and `task add` are available with Java-equivalent option contract.
- Behavior matches original Java command semantics for validation and processing.
- New tests cover happy paths and critical failures for both subcommands.
- Existing command tests remain green.

## Risks and Mitigations

- Enterprise/non-enterprise branching can drift from Java behavior.
  - Mitigation: explicit tests for both branches and conditional required options.
- File path resolution differences can cause subtle regressions.
  - Mitigation: test normalization, missing files, and zero-valid-file failure path.
- API type mapping (`type`, `status`) can mismatch server enums.
  - Mitigation: strict local validation + typed mappings + failure tests.

## Rollout Notes

- This migration is self-contained and can ship behind normal branch review.
- Follow-up improvements (if desired later) should be separate PRs after parity baseline.
