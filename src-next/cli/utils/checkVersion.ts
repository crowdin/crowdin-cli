import { colors } from './colors.ts';
import type { Output } from './output.ts';

const VERSION_FILE_URL = 'https://github.com/crowdin/crowdin-cli/releases/latest/download/version.txt';
const TIMEOUT_MS = 3000;

/**
 * Fetch the latest published version and compare with the running one using semver ordering.
 * The banner is printed only when the published version is strictly newer than the current one
 * (so downgrades / dev builds don't trigger it).
 * Any failure (offline, timeout, bad response) is swallowed so it never affects the command.
 *
 * NOTE: differs from the Java CheckNewVersionAction, which used plain string inequality
 * (`!version.equals(latest)`) and thus showed the banner on any mismatch, including downgrades.
 */
export async function checkNewVersion(output: Output, currentVersion: string): Promise<void> {
  try {
    const response = await fetch(VERSION_FILE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) {
      return;
    }

    const latest = (await response.text()).split('\n')[0]?.trim();

    if (latest && isNewer(latest, currentVersion)) {
      output.log(buildBanner(currentVersion, latest));
    }
  } catch {
    // ponytail: silent like Java's catch -> Optional.empty(); version check must never break a command.
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
