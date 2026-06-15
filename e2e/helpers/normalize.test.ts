import { describe, expect, test } from 'bun:test';
import { normalize } from './normalize.ts';

describe('normalize', () => {
  test('strips ANSI color/control sequences', () => {
    expect(normalize('\x1b[32mhello\x1b[0m')).toBe('hello');
  });

  test('removes zero-width invisible characters', () => {
    expect(normalize('a\u200Bb\uFEFF')).toBe('ab');
  });

  test('masks #-prefixed ids but leaves bare counts alone', () => {
    expect(normalize('Created string #12345')).toBe('Created string #id');
    expect(normalize('Uploaded 3 files')).toBe('Uploaded 3 files');
  });

  test('masks durations', () => {
    expect(normalize('done in 1.23s')).toBe('done in <dur>');
    expect(normalize('took 450ms')).toBe('took <dur>');
  });

  test('sorts siblings within a marker block so emission order is irrelevant', () => {
    const a = normalize('◆  file b\n◆  file a\n◆  file c');
    const b = normalize('◆  file c\n◆  file b\n◆  file a');
    expect(a).toBe(b);
    expect(a).toBe('◆  file a\n◆  file b\n◆  file c');
  });

  test('sorts within each marker block but keeps the blocks in emission order', () => {
    const raw = ['●  Project info fetched', '●  Fetching project info', '◆  File b created', '◆  File a created'].join(
      '\n',
    );
    expect(normalize(raw)).toBe(
      ['●  Fetching project info', '●  Project info fetched', '◆  File a created', '◆  File b created'].join('\n'),
    );
  });

  test('does not reorder across blocks even when a later block sorts first globally', () => {
    // A naive global sort would float the ◆ lines above the ● lines (◆ < ●);
    // grouping keeps the ● block first because it was emitted first.
    expect(normalize('●  b\n●  a\n◆  b\n◆  a')).toBe('●  a\n●  b\n◆  a\n◆  b');
  });

  test('drops blank lines and trailing whitespace', () => {
    expect(normalize('a  \n\nb')).toBe('a\nb');
  });
});
