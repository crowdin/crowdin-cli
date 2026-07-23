import os from 'node:os';
import path from 'node:path';

// Expand a leading '~' or '~/' to the user's home directory. Node doesn't do this itself, so a
// path like '~/code/app' is otherwise treated as a literal (relative) directory name.
// Uses os.homedir() (not a destructured import) so tests that spyOn(os, 'homedir') take effect.
export function expandTilde(value: string): string {
  return value === '~' || value.startsWith('~/') ? path.join(os.homedir(), value.slice(1)) : value;
}
