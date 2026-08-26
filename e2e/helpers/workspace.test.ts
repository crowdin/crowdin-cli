import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFixtures, createWorkspace, removeWorkspace } from './workspace.ts';

const tmpRoots: string[] = [];

afterEach(async () => {
  while (tmpRoots.length) {
    await rm(tmpRoots.pop() as string, { recursive: true, force: true });
  }
});

async function scratch(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'ws-test-'));
  tmpRoots.push(dir);
  return dir;
}

describe('createWorkspace', () => {
  test('creates a suite directory under the given root and returns its path', async () => {
    const root = await scratch();
    const ws = await createWorkspace('upload-sources', { root });
    expect(ws.startsWith(root)).toBe(true);
    expect(
      (await Bun.file(join(ws, '.keep')).exists()) || (await Bun.$`test -d ${ws}`.nothrow().quiet()).exitCode === 0,
    ).toBe(true);
  });

  test('produces a distinct directory per suite', async () => {
    const root = await scratch();
    const a = await createWorkspace('suite-a', { root });
    const b = await createWorkspace('suite-b', { root });
    expect(a).not.toBe(b);
  });
});

describe('copyFixtures', () => {
  test('copies fixture files into the workspace', async () => {
    const root = await scratch();
    const fixtures = join(root, 'fixtures');
    await Bun.write(join(fixtures, 'sources', 'en.md'), '# hello');
    const ws = await createWorkspace('s', { root });

    await copyFixtures(fixtures, ws);

    expect(await Bun.file(join(ws, 'sources', 'en.md')).text()).toBe('# hello');
  });

  test('excludes the top-level config/ directory', async () => {
    const root = await scratch();
    const fixtures = join(root, 'fixtures');
    await Bun.write(join(fixtures, 'config', 'crowdin.yml'), 'project_id: "{{projectId}}"');
    await Bun.write(join(fixtures, 'sources', 'en.md'), '# hello');
    const ws = await createWorkspace('s', { root });

    await copyFixtures(fixtures, ws);

    expect(await Bun.file(join(ws, 'config', 'crowdin.yml')).exists()).toBe(false);
    expect(await Bun.file(join(ws, 'sources', 'en.md')).exists()).toBe(true);
  });
});

describe('removeWorkspace', () => {
  test('removes the workspace directory', async () => {
    const root = await scratch();
    const ws = await createWorkspace('s', { root });
    await writeFile(join(ws, 'f.txt'), 'x');

    await removeWorkspace(ws);

    expect((await Bun.$`test -d ${ws}`.nothrow().quiet()).exitCode).not.toBe(0);
  });
});
