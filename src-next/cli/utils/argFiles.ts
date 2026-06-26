import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mirrors picocli's @-file expansion (PicocliRunner sets setExpandAtFiles(true)).
// We use the "simplified" mode: each non-empty, non-comment line in the file is
// one argument, taken verbatim after trimming. No quote or backslash processing.
//
//   crowdin @args.txt   ->   args from args.txt spliced in place
//   @@foo               ->   literal "@foo" (escape, no file read)
//   missing file        ->   "@path" kept literal (picocli does not error)
//
// Lines are expanded recursively: a line that itself starts with "@" is treated
// as another arg file. A cycle guard prevents infinite recursion.
const COMMENT_CHAR = '#';

export function expandArgFiles(args: string[]): string[] {
  return expand(args, new Set());
}

function expand(args: string[], seen: Set<string>): string[] {
  const result: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('@@')) {
      // Escaped: drop one '@', no expansion.
      result.push(arg.slice(1));
      continue;
    }

    if (!arg.startsWith('@') || arg.length === 1) {
      result.push(arg);
      continue;
    }

    const path = resolve(arg.slice(1));

    if (seen.has(path) || !existsSync(path)) {
      // Cycle or unreadable file: keep the @-arg literal, like picocli.
      result.push(arg);
      continue;
    }

    seen.add(path);

    result.push(...expand(readArgFile(path), seen));

    seen.delete(path);
  }

  return result;
}

function readArgFile(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line[0] !== COMMENT_CHAR);
}
