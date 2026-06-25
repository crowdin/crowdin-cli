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
