import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// @-file expansion: an `@path` argument is replaced by the arguments read from that file.
//
//   - arguments are whitespace-separated (spaces, tabs, newlines)
//   - single or double quotes group an argument and are stripped
//   - inside quotes, a backslash escapes the next character ("\\" -> "\", '\"' -> '"')
//   - an unquoted '#' starts a comment that runs to end of line
//   - quoting allows empty ("") and whitespace-containing arguments
//
//   crowdin @args.txt   ->   args from args.txt spliced in place
//   @@foo               ->   literal "@foo" (escape, no file read)
//   missing file        ->   "@path" kept literal (no error)
//
// A file arg starting with "@" inside the file is expanded recursively; a cycle
// guard keeps that from looping forever.
//
// ponytail: no octal/unicode escapes; add only if a real arg file needs them.
const COMMENT_CHAR = '#';

export function expandArgFiles(args: string[]): string[] {
  return expand(args, new Set());
}

function expand(args: string[], seen: Set<string>): string[] {
  const result: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('@@')) {
      result.push(arg.slice(1));
      continue;
    }

    if (!arg.startsWith('@') || arg.length === 1) {
      result.push(arg);
      continue;
    }

    const path = resolve(arg.slice(1));

    if (seen.has(path) || !existsSync(path)) {
      // Cycle or unreadable file: keep the @-arg literal.
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
  return tokenize(readFileSync(path, 'utf8'));
}

function tokenize(content: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let hasToken = false; // tracks a quoted "" so it is not dropped as an empty token
  let quote: '"' | "'" | null = null;

  const flush = () => {
    if (hasToken) {
      tokens.push(cur);
      cur = '';
      hasToken = false;
    }
  };

  for (let i = 0; i < content.length; i++) {
    const c = content[i];

    if (quote) {
      if (c === '\\' && i + 1 < content.length) {
        cur += content[++i];
      } else if (c === quote) {
        quote = null;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      hasToken = true;
    } else if (c === COMMENT_CHAR) {
      while (i < content.length && content[i] !== '\n') i++;
      flush();
    } else if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f') {
      flush();
    } else {
      cur += c;
      hasToken = true;
    }
  }

  flush();

  return tokens;
}
