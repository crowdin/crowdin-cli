import os from 'node:os';

export function openUrl(url: string): boolean {
  const platform = os.platform();

  const command =
    platform === 'win32'
      ? // cmd.exe treats `&` as a command separator, so `&` in the URL must be escaped as `^&`.
        ['cmd', '/c', 'start', '', url.replace(/&/g, '^&')]
      : [platform === 'darwin' ? 'open' : 'xdg-open', url];

  try {
    Bun.spawn(command);
    return true;
  } catch {
    // Browser opener not available (e.g. xdg-open missing on headless Linux).
    return false;
  }
}
