import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True when the call was killed by the per-run timeout rather than exiting on its own. */
  timedOut: boolean;
}

export interface CliRunOptions {
  /** Environment variables merged onto the (credential-stripped) process env. */
  env?: Record<string, string>;
  /** Working directory; defaults to the workspace. */
  cwd?: string;
  /** Skip the auto-appended `-c <config>` flag (the output flags are always added - see run()). */
  noConfig?: boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const REPO_ROOT = join(import.meta.dir, '..', '..');

// Ambient credentials a dev machine may have and CI never does: these vars, and a `~/.crowdin.yml`
// identity file, which outranks the config file.
const CREDENTIAL_ENV_VARS = ['CROWDIN_PROJECT_ID', 'CROWDIN_PERSONAL_TOKEN', 'CROWDIN_BASE_PATH', 'CROWDIN_BASE_URL'];
// Shared rather than per workspace: bun writes its transpiler cache under HOME.
// ponytail: HOME only - Windows reads USERPROFILE, add it if e2e ever runs there.
const ISOLATED_HOME = join(tmpdir(), 'crowdin-e2e-home');

const CLI_COMMAND = ['bun', join(REPO_ROOT, 'src-next', 'cli.ts')];

export class CliRunner {
  constructor(private readonly opts: { workspace: string; configPath: string }) {}

  async run(args: string[], runOpts: CliRunOptions = {}): Promise<CliResult> {
    const fullArgs = [...args];

    if (!runOpts.noConfig) {
      fullArgs.push('-c', this.opts.configPath);
    }

    // Always appended, `noConfig` or not: without `--no-progress` the spinner's frames land in
    // stdout, and how many depends on how long the call took.
    fullArgs.push('--no-progress', '--no-colors');

    const env: Record<string, string | undefined> = { ...process.env, HOME: ISOLATED_HOME };

    for (const key of CREDENTIAL_ENV_VARS) {
      delete env[key];
    }

    Object.assign(env, runOpts.env);

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
