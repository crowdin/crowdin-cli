import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export function platformPackageName(platform = process.platform, arch = process.arch, musl = isMusl()) {
  const suffix = platform === 'linux' && musl ? '-musl' : '';
  return `@crowdin/cli-${platform}-${arch}${suffix}`;
}

/** A glibc Linux reports glibcVersionRuntime; a musl one (Alpine) does not. */
export function isMusl() {
  if (process.platform !== 'linux') {
    return false;
  }
  try {
    return !process.report.getReport().header.glibcVersionRuntime;
  } catch {
    return false;
  }
}

// Resolved via the manifest rather than the binary itself so the lookup is immune
// to "exports" restrictions.
export function resolveBinaryPath(packageName = platformPackageName()) {
  const require = createRequire(import.meta.url);
  const executable = process.platform === 'win32' ? 'crowdin.exe' : 'crowdin';
  try {
    const manifest = require.resolve(`${packageName}/package.json`);
    const binary = path.join(path.dirname(manifest), 'bin', executable);
    return existsSync(binary) ? binary : null;
  } catch {
    return null;
  }
}

export function main(packageName = platformPackageName()) {
  const binary = resolveBinaryPath(packageName);

  if (!binary) {
    console.error(
      `Crowdin CLI could not find its binary for ${process.platform}-${process.arch} (expected in the ${packageName} package).\n` +
        'Your platform may be unsupported, or the platform package was skipped during install.\n' +
        `Try reinstalling, or install the platform package directly: npm install -g ${packageName}`,
    );
    process.exit(1);
  }

  const result = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.signal ? 1 : (result.status ?? 0));
}
