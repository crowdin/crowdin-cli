import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// End-to-end exit-code checks: spawn the real CLI as a subprocess and assert the process exit
// code for paths that need no network (usage errors and config load failures). The HTTP-error
// codes (101/103/129) are covered at the unit level in cli/errors/CliError.test.ts.

const CLI = join(import.meta.dir, '..', '..', 'src-next', 'cli.ts');

let workspace: string;

async function runCli(args: string[], cwd: string): Promise<number> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'ignore',
    stderr: 'ignore',
  });

  return await proc.exited;
}

async function captureCli(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(['bun', CLI, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
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

  test('unknown option on a subcommand exits 2 (usage error)', async () => {
    expect(await runCli(['file', '--bogus'], workspace)).toBe(2);
  });

  test('missing config file exits 102 (not found)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-exitcode-missing-'));

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
      const out = await captureCli(['file', 'list'], dir);
      expect(out).toContain('does not exist');
      expect(out).not.toMatch(/^\s+at /m);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('with --debug prints the full stack trace', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crowdin-debug-on-'));

    try {
      const out = await captureCli(['file', 'list', '--debug'], dir);
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
