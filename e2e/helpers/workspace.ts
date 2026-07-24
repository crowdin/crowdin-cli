import { cp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Per-process root for all e2e workspaces: `<os-tmp>/crowdin-e2e/<pid>-<seed>`.
 * The seed keeps concurrent processes (and reruns) from colliding.
 */
const DEFAULT_ROOT = join(tmpdir(), 'crowdin-e2e', `${process.pid}-${Math.floor(Math.random() * 1e6)}`);

export interface WorkspaceOptions {
  /** Override the root directory (used by tests). Defaults to the per-process tmp root. */
  root?: string;
}

/**
 * Create (and return) a fresh per-suite workspace directory.
 *
 * Resolved via `realpath`: on macOS, `os.tmpdir()` lives under `/var/folders/...`,
 * but `/var` is a symlink to `/private/var`. A spawned CLI process's own
 * `process.cwd()` reports the symlink-resolved path (that's how `getcwd(3)`
 * works), so if `ctx.workspace` kept the unresolved form, any assertion built
 * from it (e.g. an absolute path the CLI echoes back) would never match.
 */
export async function createWorkspace(suite: string, opts: WorkspaceOptions = {}): Promise<string> {
  const ws = join(opts.root ?? DEFAULT_ROOT, suite);
  await mkdir(ws, { recursive: true });
  return await realpath(ws);
}

/**
 * Recursively copy a suite's fixtures into the workspace, skipping the top-level
 * `config/` directory (its `crowdin.yml` template is rendered separately).
 */
export async function copyFixtures(fixturesDir: string, workspace: string): Promise<void> {
  const excludedConfig = join(fixturesDir, 'config');
  await cp(fixturesDir, workspace, {
    recursive: true,
    filter: (src) => src !== excludedConfig,
  });
}

/** Remove a workspace directory. Safe to call on a non-existent path. */
export async function removeWorkspace(workspace: string): Promise<void> {
  await rm(workspace, { recursive: true, force: true });
}
