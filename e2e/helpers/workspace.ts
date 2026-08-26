import { cp, mkdir, rm } from 'node:fs/promises';
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

/** Create (and return) a fresh per-suite workspace directory. */
export async function createWorkspace(suite: string, opts: WorkspaceOptions = {}): Promise<string> {
  const ws = join(opts.root ?? DEFAULT_ROOT, suite);
  await mkdir(ws, { recursive: true });
  return ws;
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
