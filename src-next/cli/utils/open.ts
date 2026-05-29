import os from 'node:os';

export function openUrl(url: string): void {
  const platform = os.platform();

  if (platform === 'win32') {
    Bun.spawn(['cmd', '/c', 'start', '', url]);
  } else {
    Bun.spawn([platform === 'darwin' ? 'open' : 'xdg-open', url]);
  }
}
