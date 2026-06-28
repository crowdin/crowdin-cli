import { colors } from './colors.ts';
import type { Output } from './output.ts';

const VERSION_FILE_URL = 'https://github.com/crowdin/crowdin-cli/releases/latest/download/version.txt';
const TIMEOUT_MS = 3000;

/**
 * Mirrors Java CheckNewVersionAction: fetch the latest published version, compare with the
 * running one (plain string inequality, not semver), and print a banner when they differ.
 * Any failure (offline, timeout, bad response) is swallowed so it never affects the command.
 */
export async function checkNewVersion(output: Output, currentVersion: string): Promise<void> {
  try {
    const response = await fetch(VERSION_FILE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!response.ok) {
      return;
    }

    const latest = (await response.text()).split('\n')[0]?.trim();

    if (latest && latest !== currentVersion) {
      output.log(buildBanner(currentVersion, latest));
    }
  } catch {
    // ponytail: silent like Java's catch -> Optional.empty(); version check must never break a command.
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
