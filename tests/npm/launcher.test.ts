import { afterAll, describe, expect, it } from 'bun:test';
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isMusl, platformPackageName, resolveBinaryPath } from '../../packages/npm/cli/bin/launcher.js';
import launcherPkg from '../../packages/npm/cli/package.json';

const repoRoot = path.resolve(import.meta.dir, '../..');
const launcherEntry = './packages/npm/cli/bin/launcher.js';

describe('platformPackageName', () => {
  it('maps darwin arm64', () => {
    expect(platformPackageName('darwin', 'arm64', false)).toBe('@crowdin/cli-darwin-arm64');
  });

  it('maps darwin x64', () => {
    expect(platformPackageName('darwin', 'x64', false)).toBe('@crowdin/cli-darwin-x64');
  });

  it('maps linux x64 glibc', () => {
    expect(platformPackageName('linux', 'x64', false)).toBe('@crowdin/cli-linux-x64');
  });

  it('maps linux arm64 musl', () => {
    expect(platformPackageName('linux', 'arm64', true)).toBe('@crowdin/cli-linux-arm64-musl');
  });

  it('maps win32 x64', () => {
    expect(platformPackageName('win32', 'x64', false)).toBe('@crowdin/cli-win32-x64');
  });

  it('applies the musl suffix only on linux', () => {
    expect(platformPackageName('darwin', 'arm64', true)).toBe('@crowdin/cli-darwin-arm64');
    expect(platformPackageName('win32', 'x64', true)).toBe('@crowdin/cli-win32-x64');
  });

  it('covers exactly the optionalDependencies of the launcher package', () => {
    const combos: Array<[NodeJS.Platform, NodeJS.Architecture, boolean]> = [
      ['darwin', 'arm64', false],
      ['darwin', 'x64', false],
      ['linux', 'x64', false],
      ['linux', 'arm64', false],
      ['linux', 'x64', true],
      ['linux', 'arm64', true],
      ['win32', 'x64', false],
    ];
    const generated = new Set(combos.map(([platform, arch, musl]) => platformPackageName(platform, arch, musl)));
    expect(generated).toEqual(new Set(Object.keys(launcherPkg.optionalDependencies)));
  });
});

describe('isMusl', () => {
  it('is false off linux and boolean on linux', () => {
    if (process.platform === 'linux') {
      expect(typeof isMusl()).toBe('boolean');
    } else {
      expect(isMusl()).toBe(false);
    }
  });
});

describe('resolveBinaryPath', () => {
  it('returns null for a package that is not installed', () => {
    expect(resolveBinaryPath('@crowdin/cli-nonexistent-platform')).toBeNull();
  });
});

describe('launcher process', () => {
  // Planted inside the repo's node_modules so the launcher's own createRequire finds it.
  const fakePackage = '@crowdin/cli-launcher-test-fake';
  const fakeDir = path.join(repoRoot, 'node_modules', fakePackage);

  afterAll(() => {
    rmSync(fakeDir, { recursive: true, force: true });
  });

  it('exits 1 with a helpful message when the platform package is missing', () => {
    const result = Bun.spawnSync(
      ['node', '-e', `import('${launcherEntry}').then((m) => m.main('@crowdin/cli-definitely-missing'))`],
      { cwd: repoRoot },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain('@crowdin/cli-definitely-missing');
  });

  // The fake binary is a shell script, which Windows cannot exec as crowdin.exe.
  it.skipIf(process.platform === 'win32')('spawns the platform binary and forwards its exit code', () => {
    mkdirSync(path.join(fakeDir, 'bin'), { recursive: true });
    writeFileSync(path.join(fakeDir, 'package.json'), JSON.stringify({ name: fakePackage, version: '0.0.0' }));
    const fakeBinary = path.join(fakeDir, 'bin', 'crowdin');
    writeFileSync(fakeBinary, '#!/bin/sh\necho "fake-crowdin $@"\nexit 7\n');
    chmodSync(fakeBinary, 0o755);

    expect(resolveBinaryPath(fakePackage)).toBe(fakeBinary);

    const result = Bun.spawnSync(
      ['node', '-e', `import('${launcherEntry}').then((m) => m.main('${fakePackage}'))`, '--', '--version'],
      { cwd: repoRoot },
    );
    expect(result.stdout.toString()).toContain('fake-crowdin');
    expect(result.exitCode).toBe(7);
  });
});

describe('launcher manifest', () => {
  it('declares the launcher script as the crowdin bin', () => {
    expect(launcherPkg.bin).toEqual({ crowdin: './bin/crowdin.js' });
    expect(launcherPkg.files).toEqual(['bin']);
  });

  it('publishes to the next dist-tag with public access', () => {
    expect(launcherPkg.publishConfig).toEqual({ access: 'public', tag: 'next' });
  });
});
