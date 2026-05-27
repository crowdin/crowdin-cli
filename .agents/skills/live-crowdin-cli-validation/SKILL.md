---
name: live-cli-command-validation
description: Validates CLI commands against live environments with safe setup and cleanup. Use when running `bun run dev ...` or equivalent against real services, validating subcommands in parallel, or diagnosing inconsistent results where some commands pass and others fail.
---

# Live CLI Command Validation

Use this workflow for live validation of any CLI command that touches real external services.

## Non-negotiable rules

1. Run live API commands with unrestricted permissions from the first external call:
   - `required_permissions: ["all"]` for shell/subagent shell commands.
2. Use `--no-progress` for deterministic logs.
3. Use timestamped disposable identifiers/names for created entities.
4. Capture exit code and key output for every command.
5. Clean up created artifacts when feasible.

## Preflight (required before subcommand validation)

Run these checks in order:

1. `<cli-entrypoint> <command> --help`
2. Read environment state required by the command (for example list resources, show config, auth probe).
3. Determine command prerequisites:
   - required ids/paths/branches/resources
   - mutating vs read-only behavior
   - cleanup strategy for disposable data

If preflight fails with `403`, do not conclude command regression until permissions/auth context is corrected and preflight is retried.

## Universal validation pattern

For each command/subcommand under test:

1. **Happy path run**
   - Execute one valid invocation with complete required arguments.
2. **Validation error run**
   - Execute one intentionally invalid invocation to verify local validation behavior.
3. **If mutating**
   - Create disposable fixture first.
   - Execute target mutation.
   - Verify post-state if possible.
   - Cleanup fixture.
4. **Output capture**
   - record exact command
   - record exit code
   - record key output/error lines

Avoid unsupported flags not present in help output.

## Command-shape adapters

Use one of these adapters depending on command shape:

### Read-only commands (`list`, `show`, `status`)

- success run (normal mode)
- success run (verbose/diagnostic mode)
- classify API/auth/environment failures separately from CLI parsing failures

### Create commands (`add`, `create`, `upload`)

- discover valid dependency inputs first (resource path/id/branch)
- run successful create with timestamped payload
- run one invalid-input case
- store created id for downstream tests and cleanup

### Update commands (`edit`, `update`)

- create or discover target id
- run successful update changing at least one field
- run no-op/invalid update to confirm validation
- cleanup if target was disposable

### Delete commands (`delete`, `remove`)

- create or discover deletable target id
- run successful delete
- run invalid-id case (for example non-numeric where applicable)
- confirm failure classification is validation, not transport

## Parallel subagent policy

When validating multiple subcommands in parallel:

1. Spawn one subagent per subcommand.
2. Ensure each subagent performs its own preflight with unrestricted permissions.
3. Require each report to include:
   - exact commands
   - exit codes
   - created/updated/deleted ids (if applicable)
   - cleanup status
   - failure class (validation/API/auth/lock/other)

## Transient lock/conflict handling

If backend returns lock/conflict style responses (for example concurrent edit conflicts), retry with bounded attempts:

- max retries: 3
- backoff: 2s, 4s, 8s
- keep same fixture context in logs

Do not classify lock conflicts as command regressions unless retries are exhausted.

## Result classification

Classify outcomes explicitly:

- **CLI validation error expected**: local input validation works (non-zero expected).
- **Live API success**: command succeeds against live service.
- **Auth/permission context issue**: `403` or similar due to execution context mismatch.
- **Transient external lock**: safe retry scenario.
- **Environment mismatch**: wrong target resource/config/fixture path.

Only classify as command regression when behavior is reproducible after correct preflight and permission context.
