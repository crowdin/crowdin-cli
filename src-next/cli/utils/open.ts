import os from 'node:os';

export function openUrl(url: string): void {
  const platform = os.platform();
  const command = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';

  Bun.spawn([command, url]);
}
