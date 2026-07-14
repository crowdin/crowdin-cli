import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import rootPkg from '../../package.json';
import launcherPkg from '../../packages/npm/cli/package.json';

interface PlatformManifest {
  name: string;
  version: string;
  description: string;
  preferUnplugged: boolean;
  os: string[];
  cpu: string[];
  libc?: string[];
  files: string[];
  publishConfig: { access: string; tag: string };
}

const packagesRoot = path.resolve(import.meta.dir, '../../packages/npm');
const platformNames = Object.keys(launcherPkg.optionalDependencies);

function loadManifest(packageName: string): PlatformManifest {
  const dir = packageName.replace('@crowdin/cli-', '');
  return JSON.parse(readFileSync(path.join(packagesRoot, dir, 'package.json'), 'utf8'));
}

describe('platform packages', () => {
  it('exist for every optionalDependency of the launcher', () => {
    for (const name of platformNames) {
      expect(loadManifest(name).name).toBe(name);
    }
  });

  it('share the launcher version, which is pinned in optionalDependencies', () => {
    for (const [name, pinned] of Object.entries(launcherPkg.optionalDependencies)) {
      expect(loadManifest(name).version).toBe(launcherPkg.version);
      expect(pinned).toBe(launcherPkg.version);
    }
  });

  it('matches the root workspace version (manual bumps must update every manifest)', () => {
    expect(launcherPkg.version).toBe(rootPkg.version);
  });

  it('declare os/cpu/libc filters matching their package name', () => {
    for (const name of platformNames) {
      const manifest = loadManifest(name);
      const [platform, arch, musl] = name.replace('@crowdin/cli-', '').split('-');
      expect(manifest.os).toEqual([platform as string]);
      expect(manifest.cpu).toEqual([arch as string]);
      if (platform === 'linux') {
        expect(manifest.libc).toEqual([musl === 'musl' ? 'musl' : 'glibc']);
      } else {
        expect(manifest.libc).toBeUndefined();
      }
    }
  });

  it('ship only the bin directory, unplugged, on the next dist-tag', () => {
    for (const name of platformNames) {
      const manifest = loadManifest(name);
      expect(manifest.files).toEqual(['bin']);
      expect(manifest.preferUnplugged).toBe(true);
      expect(manifest.publishConfig).toEqual({ access: 'public', tag: 'next' });
    }
  });
});
