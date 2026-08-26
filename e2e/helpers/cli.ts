import { join } from 'node:path';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True when the call was killed by the per-run timeout rather than exiting on its own. */
  timedOut: boolean;
}

export interface CliRunOptions {
  /** Extra environment variables merged onto the current process env. */
  env?: Record<string, string>;
  /** Working directory; defaults to the workspace. */
  cwd?: string;
  /** Skip the auto-appended `-c <config> --no-progress --no-colors` flags. */
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
      fullArgs.push('-c', this.opts.configPath, '--no-progress', '--no-colors');
    }

    const proc = Bun.spawn([...CLI_COMMAND, ...fullArgs], {
      cwd: runOpts.cwd ?? this.opts.workspace,
      env: { ...process.env, ...runOpts.env },
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
