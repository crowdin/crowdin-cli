import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

// End-to-end shell-completion checks: spawn the real CLI as a subprocess and drive the tab
// completion protocol (`complete -- <args>` for suggestions, `complete <shell>` for the script).
// Pure argv -> stdout, no network. Spawning (rather than importing) is deliberate: it preserves the
// trailing empty arg the shell sends to request "complete the next token".

const CLI = join(import.meta.dir, '..', '..', 'src-next', 'cli.ts');

async function complete(args: string[]): Promise<string> {
  const proc = Bun.spawn(['bun', CLI, 'complete', ...args], {
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  await proc.exited;

  return stdout + stderr;
}

describe('shell completion (end-to-end)', () => {
  test('completes top-level commands', async () => {
    const out = await complete(['--', '']);
    expect(out).toContain('upload');
    expect(out).toContain('download');
    expect(out).toContain('file');
  });

  test('completes subcommands of a group', async () => {
    const out = await complete(['--', 'file', '']);
    expect(out).toContain('upload');
    expect(out).toContain('download');
    expect(out).toContain('delete');
  });

  test('filters subcommands by partial', async () => {
    const out = await complete(['--', 'file', 'up']);
    expect(out).toContain('upload');
    expect(out).not.toContain('delete');
  });

  test('completes flags for a command', async () => {
    const out = await complete(['--', 'upload', '--']);
    expect(out).toContain('--branch');
    // global options are registered per-command, so they complete too
    expect(out).toContain('--token');
  });

  test('completes option choices (space-separated)', async () => {
    const out = await complete(['--', 'file', 'list', '--output', '']);
    expect(out).toContain('json');
    expect(out).toContain('toon');
    expect(out).toContain('plain');
  });

  test('completes option choices (equals form)', async () => {
    const out = await complete(['--', 'file', 'list', '--output=']);
    expect(out).toContain('json');
    expect(out).toContain('plain');
  });

  test('generates a zsh completion script', async () => {
    const out = await complete(['zsh']);
    expect(out).toContain('#compdef crowdin');
  });

  test('generates a bash completion script', async () => {
    const out = await complete(['bash']);
    expect(out).toContain('crowdin');
    expect(out.length).toBeGreaterThan(100);
  });
});
