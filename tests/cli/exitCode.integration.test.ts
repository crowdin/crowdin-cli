import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// End-to-end exit-code checks: spawn the real CLI as a subprocess and assert the process exit
// code for paths that need no network (usage errors and config load failures). The HTTP-error
// codes (101/103/129) are covered at the unit level in cli/errors/CliError.test.ts.

const CLI = join(import.meta.dir, '..', '..', 'src-next', 'cli.ts');

let workspace: string;

/**
 * The child must not inherit CROWDIN_* credentials: Bun auto-loads the repo's `.env` into the test
 * runner's environment, and the CLI's env fallback layer would then resolve a real project — so a
 * "no config file" case exits 0 against the live API instead of 2.
 *
 * The home directory is redirected at the empty workspace for the same reason: the credentials
 * fallback reads `~/.crowdin.yml`, so a developer who has run `crowdin login` would otherwise see
 * the "no config file" cases fail on a missing project_id (2) instead of the missing file (102).
 */
function cleanEnv(): Record<string, string | undefined> {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CROWDIN_')));
  return { ...env, NO_COLOR: '1', HOME: workspace, USERPROFILE: workspace };
}

async function runCli(args: string[], cwd: string): Promise<number> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd,
    env: cleanEnv(),
    stdout: 'ignore',
    stderr: 'ignore',
  });

  return await proc.exited;
}

async function captureCli(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd,
    env: cleanEnv(),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  await proc.exited;

  return stdout + stderr;
}

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-'));
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('exit codes (offline, end-to-end)', () => {
  test('--version exits 0', async () => {
    expect(await runCli(['--version'], workspace)).toBe(0);
  });

  test('--help exits 0', async () => {
    expect(await runCli(['--help'], workspace)).toBe(0);
  });

  test('no arguments (root help) exits 0', async () => {
    expect(await runCli([], workspace)).toBe(0);
  });

  test('unknown option exits 2 (usage error)', async () => {
    expect(await runCli(['--nonsense'], workspace)).toBe(2);
  });

  test('unknown command exits 2 (usage error)', async () => {
    expect(await runCli(['boguscmd'], workspace)).toBe(2);
  });

  // an unknown command/subcommand must read as "unknown command", not commander's
  // confusing "too many arguments" (Java picocli parity: "Unknown subcommand 'X'").
  test('unknown root command reports "unknown command", not "too many arguments"', async () => {
    const out = await captureCli(['definitely-not-a-command'], workspace);
    expect(out).toContain("unknown command 'definitely-not-a-command'");
    expect(out).not.toContain('too many arguments');
  });

  test('unknown subcommand on a group reports "unknown command"', async () => {
    const out = await captureCli(['bundle', 'frobnicate'], workspace);
    expect(out).toContain("unknown command 'frobnicate'");
    expect(out).not.toContain('too many arguments');
  });

  // stderr is a contract in the machine formats too: one diagnostic record per line, so commander's
  // own prose (its 'error: ' line plus the usage hint) is suppressed and re-emitted as a record.
  test('reports a usage error as a diagnostic record under --output=json', async () => {
    const out = await captureCli(['--nonsense', '--output=json'], workspace);

    expect(JSON.parse(out.trim())).toEqual({
      level: 'error',
      message: "unknown option '--nonsense'",
      code: 2,
    });
  });

  test('reports a usage error as a record under --output=toon', async () => {
    const out = await captureCli(['boguscmd', '--output=toon'], workspace);

    expect(out.trim()).toBe("level: error\nmessage: unknown command 'boguscmd'\ncode: 2");
  });

  test('keeps commander prose in text output', async () => {
    const out = await captureCli(['--nonsense'], workspace);

    expect(out).toContain("error: unknown option '--nonsense'");
  });

  test('unknown option on a subcommand exits 2 (usage error)', async () => {
    expect(await runCli(['file', '--bogus'], workspace)).toBe(2);
  });

  // Only the files tier insists on a config file, and only when no --source/--translation replaces
  // it (Java PropertiesBuilders.buildPropertiesWithFiles + ParamsWithFiles.isEmpty).
  test('missing config file exits 102 (not found) for a file-based command', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-missing-'));

    try {
      expect(await runCli(['upload', 'sources'], dir)).toBe(102);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('explicit --config that does not exist exits 102 (not found)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-explicit-'));

    try {
      expect(await runCli(['file', 'list', '--config', join(dir, 'nope.yml')], dir)).toBe(102);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // Java separates "doesn't exist" (102) from "that's a folder" (2) for both file options
  // (ConfigurationFilesProperties.getConfigFile / getIdentityFile).
  test('explicit --config pointing at a directory exits 2 (validation)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-configdir-'));
    await mkdir(join(dir, 'somedir'));

    try {
      expect(await runCli(['file', 'list', '--config', join(dir, 'somedir')], dir)).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('explicit --identity pointing at a directory exits 2 (validation)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-identitydir-'));
    await mkdir(join(dir, 'somedir'));

    try {
      expect(await runCli(['file', 'list', '--identity', join(dir, 'somedir')], dir)).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // A project-scoped command reads the config only when it happens to exist. With no config file and
  // no token, Java reports the missing file rather than the missing options
  // (BaseProperties.checkProperties -> NotFoundException, exit 102).
  test('project-scoped command without a config file exits 102 (not found)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-noconfig-'));

    try {
      expect(await runCli(['file', 'list'], dir)).toBe(102);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('invalid config file exits 2 (validation)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-invalid-'));
    await writeFile(join(dir, 'crowdin.yml'), 'project_id: "not-a-number"\nfiles: "should-be-array"\n');

    try {
      expect(await runCli(['file', 'list'], dir)).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('--debug (hidden) stack traces, end-to-end', () => {
  test('without --debug prints a one-line error, no stack frames', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-debug-off-'));

    try {
      const out = await captureCli(['upload', 'sources'], dir);
      expect(out).toContain('does not exist');
      expect(out).not.toMatch(/^\s+at /m);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('with --debug prints the full stack trace', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-debug-on-'));

    try {
      const out = await captureCli(['upload', 'sources', '--debug'], dir);
      expect(out).toContain('does not exist');
      expect(out).toMatch(/^\s+at /m);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('--debug is hidden from help', async () => {
    const out = await captureCli(['--help'], workspace);
    expect(out).not.toContain('--debug');
  });
});
