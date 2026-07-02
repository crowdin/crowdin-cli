import os from 'node:os';
import path from 'node:path';
import { colors } from './colors.ts';
import type { Output } from './output.ts';

const VERSION_FILE_URL = 'https://github.com/crowdin/crowdin-cli/releases/latest/download/version.txt';
const TIMEOUT_MS = 3000;
// Only hit the network once per day; between checks the banner is served from the cached latest version
// so it still shows on every command without a request per invocation.
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hr

interface VersionCache {
  lastCheck: number;
  latest: string;
}

interface CheckOptions {
  /** Cache file location; defaults to ~/.crowdin/version-check.json. Overridable for tests. */
  cachePath?: string;
  /** How long a cached latest version is considered fresh. */
  ttlMs?: number;
  /** Current time; overridable for tests. */
  now?: number;
}

/**
 * Compare the latest published version with the running one using semver ordering and print a banner
 * when the published version is strictly newer (so downgrades / dev builds don't trigger it).
 *
 * The remote lookup is throttled: it runs at most once per {@link CHECK_INTERVAL_MS}. Between lookups the
 * last-seen version is read from a small cache file, so the banner still appears every command without a
 * network request each time. Any failure (offline, timeout, bad response, unreadable cache) is swallowed
 * so it never affects the command; a stale cache is used as a fallback when the network is unreachable.
 *
 * NOTE: differs from the Java CheckNewVersionAction, which fetched on every run and used plain string
 * inequality (`!version.equals(latest)`), showing the banner on any mismatch including downgrades.
 */
export async function checkNewVersion(output: Output, currentVersion: string, opts: CheckOptions = {}): Promise<void> {
  const cachePath = opts.cachePath ?? defaultCachePath();
  const ttlMs = opts.ttlMs ?? CHECK_INTERVAL_MS;
  const now = opts.now ?? Date.now();

  const cache = await readCache(cachePath);

  // Fresh cache: serve the banner from the cached version, no network.
  if (cache && now - cache.lastCheck < ttlMs) {
    maybeBanner(output, currentVersion, cache.latest);
    return;
  }

  const latest = await fetchLatest();

  if (latest) {
    await writeCache(cachePath, { lastCheck: now, latest });
    maybeBanner(output, currentVersion, latest);
    return;
  }

  // Network failed: fall back to a stale cache (don't refresh the timestamp so we retry next run).
  if (cache) {
    maybeBanner(output, currentVersion, cache.latest);
  }
}

function defaultCachePath(): string {
  return path.join(os.homedir(), '.crowdin', 'version-check.json');
}

async function readCache(cachePath: string): Promise<VersionCache | null> {
  try {
    const file = Bun.file(cachePath);

    if (!(await file.exists())) {
      return null;
    }

    const data = (await file.json()) as VersionCache;

    if (typeof data.lastCheck === 'number' && typeof data.latest === 'string') {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

async function writeCache(cachePath: string, cache: VersionCache): Promise<void> {
  try {
    await Bun.write(cachePath, JSON.stringify(cache));
  } catch {
    // ponytail: cache is an optimization; a failed write just means we fetch again next run.
  }
}

async function fetchLatest(): Promise<string | null> {
  try {
    const response = await fetch(VERSION_FILE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) {
      return null;
    }

    const latest = (await response.text()).split('\n')[0]?.trim();

    return latest || null;
  } catch {
    return null;
  }
}

function maybeBanner(output: Output, currentVersion: string, latest: string): void {
  if (isNewer(latest, currentVersion)) {
    output.log(buildBanner(currentVersion, latest));
  }
}

function isNewer(latest: string, current: string): boolean {
  try {
    return Bun.semver.order(latest, current) > 0;
  } catch {
    return false;
  }
}

function buildBanner(currentVersion: string, latest: string): string {
  const lines = [
    `A new version of Crowdin CLI is available: ${currentVersion} -> ${latest}`,
    'https://github.com/crowdin/crowdin-cli/releases/latest',
  ];
  const width = Math.max(...lines.map((line) => line.length));
  const top = `╭─${'─'.repeat(width)}─╮`;
  const bottom = `╰─${'─'.repeat(width)}─╯`;
  const body = lines.map((line) => `│ ${line.padEnd(width)} │`).join('\n');

  return colors.yellow([top, body, bottom].join('\n'));
}
