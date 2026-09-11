import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandArgFiles } from '@/cli/utils/argFiles.ts';

const dir = mkdtempSync(join(tmpdir(), 'argfiles-'));

function file(name: string, content: string): string {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('expandArgFiles', () => {
  test('leaves plain args untouched', () => {
    expect(expandArgFiles(['upload', 'sources', '-b', 'main'])).toEqual(['upload', 'sources', '-b', 'main']);
  });

  test('splices file args in place, newline-separated', () => {
    const path = file('basic.txt', 'upload\nsources\n-b\nmain\n');
    expect(expandArgFiles([`@${path}`, '--verbose'])).toEqual(['upload', 'sources', '-b', 'main', '--verbose']);
  });

  test('splits args on whitespace (default picocli mode, not one-per-line)', () => {
    const path = file('spaced.txt', 'upload sources\t-b   main\n');
    expect(expandArgFiles([`@${path}`])).toEqual(['upload', 'sources', '-b', 'main']);
  });

  test('skips empty lines and # comments, including trailing comments', () => {
    const path = file('comments.txt', '# header\n\nupload sources\n  # indented comment\nedit # trailing\n');
    expect(expandArgFiles([`@${path}`])).toEqual(['upload', 'sources', 'edit']);
  });

  test('quotes group whitespace into one arg and are stripped', () => {
    const path = file('quotes.txt', '--config "/a b/c.yml"\n--name \'foo bar\'\n');
    expect(expandArgFiles([`@${path}`])).toEqual(['--config', '/a b/c.yml', '--name', 'foo bar']);
  });

  test('backslash escapes inside quotes; # inside quotes is literal', () => {
    const path = file('escapes.txt', '"c:\\\\Program Files" "a#b"\n');
    expect(expandArgFiles([`@${path}`])).toEqual(['c:\\Program Files', 'a#b']);
  });

  test('quoted empty string is preserved as an empty arg', () => {
    const path = file('empty.txt', '--title ""\n');
    expect(expandArgFiles([`@${path}`])).toEqual(['--title', '']);
  });

  test('@@ escapes to a literal @arg without reading a file', () => {
    expect(expandArgFiles(['@@notafile'])).toEqual(['@notafile']);
  });

  test('keeps the arg literal when the file is missing', () => {
    expect(expandArgFiles(['@/no/such/file.txt'])).toEqual(['@/no/such/file.txt']);
  });

  test('bare @ is left untouched', () => {
    expect(expandArgFiles(['@'])).toEqual(['@']);
  });

  test('expands nested arg files recursively', () => {
    const inner = file('inner.txt', '-b\nmain\n');
    const outer = file('outer.txt', `upload\n@${inner}\n`);

    expect(expandArgFiles([`@${outer}`])).toEqual(['upload', '-b', 'main']);
  });

  test('breaks reference cycles without infinite recursion', () => {
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');

    writeFileSync(a, `x\n@${b}\n`);
    writeFileSync(b, `y\n@${a}\n`);

    // a -> x, then b -> y, then @a is already on the stack so kept literal.
    expect(expandArgFiles([`@${a}`])).toEqual(['x', 'y', '@' + a]);
  });
});
