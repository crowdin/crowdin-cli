import { createHash } from 'node:crypto';
import path from 'node:path';
import type { BunFile } from 'bun';
import type { Output } from '@/cli/utils/output.ts';

interface CacheFile {
  sourceHashes?: Record<string, string>;
}

function getCachePath(basePath: string): string {
  return path.join(basePath, '.crowdin', 'cache.json');
}

export async function computeChecksum(file: BunFile): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await file.bytes());
  return hash.digest('hex');
}

export async function loadSourceCache(basePath: string, output: Output): Promise<Map<string, string>> {
  const cachePath = getCachePath(basePath);
  const cacheFile = Bun.file(cachePath);

  if (!(await cacheFile.exists())) {
    return new Map();
  }

  try {
    const data = (await cacheFile.json()) as CacheFile;
    return new Map(Object.entries(data.sourceHashes ?? {}));
  } catch {
    output.warning(`Failed to read cache file ${cachePath}, starting with an empty cache`);
    return new Map();
  }
}

export async function saveSourceCache(
  basePath: string,
  sourceHashes: Map<string, string>,
  output: Output,
): Promise<void> {
  const cachePath = getCachePath(basePath);

  try {
    await Bun.write(cachePath, JSON.stringify({ sourceHashes: Object.fromEntries(sourceHashes) }, null, 4));
  } catch {
    output.warning(`Failed to write cache file ${cachePath}`);
  }
}
