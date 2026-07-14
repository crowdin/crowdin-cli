import os from 'node:os';

export function openUrl(url: string): boolean {
  const platform = os.platform();

  const command =
    platform === 'win32' ? ['cmd', '/c', 'start', '', url] : [platform === 'darwin' ? 'open' : 'xdg-open', url];

  try {
    Bun.spawn(command);
    return true;
  } catch {
    // Browser opener not available (e.g. xdg-open missing on headless Linux).
    return false;
  }
}
