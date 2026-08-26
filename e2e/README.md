# E2E tests

End-to-end tests that run the CLI against a real, freshly-created Crowdin project, assert on normalized output / exit codes / downloaded files, and clean up afterwards.

## Running locally

```bash
export CROWDIN_E2E_TOKEN=xxxxxxxx...
bun run test:e2e
bun test e2e/ --update-snapshots
```

## Environment

| Variable | Required | Meaning |
|---|---|---|
| `CROWDIN_E2E_TOKEN` | true | Personal access token of the test account |
| `CROWDIN_E2E_KEEP` | false | `1` keeps the project + workspace |

The suites always run the CLI via `bun src-next/cli.ts` - locally and in CI.

## Layout

```
e2e/
  helpers/   # env, workspace, config, cli, normalize, project, suite (+ unit tests)
  fixtures/  # <suite>/config/crowdin.yml template + source files (e.g. sources/)
  suites/    # one self-contained suite per file; each owns one project
```

Each suite is one file: `beforeAll` provisions (workspace + project + config), `test()`s run in declaration order to exercise the CLI, `afterAll` tears down.
