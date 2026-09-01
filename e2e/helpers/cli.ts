import { join } from 'node:path';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True when the call was killed by the per-run timeout rather than exiting on its own. */
  timedOut: boolean;
}

export interface CliRunOptions {
  /**
   * Environment variables merged onto the current process env. A key set to `undefined` is
   * REMOVED from the child's environment rather than merged - the only way to hide a variable the
   * test process itself inherited. The repo-root `.env` (auto-loaded by Bun) sets `CROWDIN_*`
   * values that `cli/config.ts`'s `envFallbackLayer` reads as its lowest config layer, so a suite
   * asserting that a credential is *missing* has to remove them explicitly; CI, which sets only
   * `CROWDIN_E2E_TOKEN`, would otherwise disagree with a local run.
   */
  env?: Record<string, string | undefined>;
  /** Working directory; defaults to the workspace. */
  cwd?: string;
  /** Skip the auto-appended `-c <config>` flag (the output flags are always added - see run()). */
  noConfig?: boolean;
  /** Per-call timeout in milliseconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const REPO_ROOT = join(import.meta.dir, '..', '..');

/** The single way the suites invoke the CLI: the source entry point through bun. */
const CLI_COMMAND = ['bun', join(REPO_ROOT, 'src-next', 'cli.ts')];

export class CliRunner {
  constructor(private readonly opts: { workspace: string; configPath: string }) {}

  async run(args: string[], runOpts: CliRunOptions = {}): Promise<CliResult> {
    const fullArgs = [...args];

    if (!runOpts.noConfig) {
      fullArgs.push('-c', this.opts.configPath);
    }

    // Always appended, `noConfig` or not: these are about making stdout parseable, not about which
    // config the CLI reads. Without `--no-progress` the spinner's animation frames (`◒◐◓◑`) land in
    // the captured output, and how many frames appear depends on how long the call took - which made
    // every snapshot in the noConfig suites (init, dest, upload-single-file, without-config-param,
    // pre-translate) flaky rather than wrong.
    fullArgs.push('--no-progress', '--no-colors');

    const env: Record<string, string | undefined> = { ...process.env, ...runOpts.env };

    for (const [key, value] of Object.entries(runOpts.env ?? {})) {
      if (value === undefined) {
        delete env[key];
      }
    }

    const proc = Bun.spawn([...CLI_COMMAND, ...fullArgs], {
      cwd: runOpts.cwd ?? this.opts.workspace,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, runOpts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stdout, stderr, exitCode, timedOut };
    } finally {
      clearTimeout(timeout);
    }
  }
}
