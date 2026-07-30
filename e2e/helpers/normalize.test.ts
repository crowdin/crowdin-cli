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

  test('collapses the volatile temp workspace root to a stable token', () => {
    const a = normalize("skeleton '/private/var/folders/v9/x32/T/crowdin-e2e/70577-316735/init/crowdin.yaml'");
    const b = normalize("skeleton '/private/var/folders/3q/0y5/T/crowdin-e2e/27926-819747/init/crowdin.yaml'");
    expect(a).toBe(b);
    expect(a).toBe("skeleton '<workspace>/init/crowdin.yaml'");
  });

  test('leaves absolute paths without the temp marker untouched', () => {
    // The mask is anchored on `crowdin-e2e/<pid>-<seed>`; a real path (e.g. a base_path the CLI
    // echoes) must survive, otherwise the mask would swallow load-bearing paths in assertions.
    const line = "base_path: '/Users/dev/project/crowdin.yaml'";
    expect(normalize(line)).toBe(line);
  });

  test('masks multiple temp paths on one line independently', () => {
    // The `[^\s'"]*` prefix (not `.*`) stops at the space between the two paths, so the global
    // replace masks each root separately instead of spanning the gap and merging them.
    const line = 'copied /tmp/crowdin-e2e/1-2/a/x.yaml to /tmp/crowdin-e2e/3-4/b/y.yaml';
    expect(normalize(line)).toBe('copied <workspace>/a/x.yaml to <workspace>/b/y.yaml');
  });

  test('drops blank lines and trailing whitespace', () => {
    expect(normalize('a  \n\nb')).toBe('a\nb');
  });

  test('normalizes interleaved status lines to the same result regardless of race order', () => {
    // The real flake: a `◆` success line for one file lands between two `●` lines, and which one
    // wins is a race. Both orderings must normalize identically or the snapshot is a coin flip.
    const raceA = ['●  Importing a', '●  Importing b', '◆  File a', '◆  File b'].join('\n');
    const raceB = ['●  Importing a', '◆  File a', '●  Importing b', '◆  File b'].join('\n');

    expect(normalize(raceA)).toBe(normalize(raceB));
    expect(normalize(raceB)).toBe(['●  Importing a', '●  Importing b', '◆  File a', '◆  File b'].join('\n'));
  });

  test('keeps table rows within their own table instead of merging every table', () => {
    // Table rows share the `│` marker but are not concurrent output, so they keep the
    // contiguous-run rule - two separate tables must not be sorted into one another.
    const output = ['│ b │', '│ a │', 'between', '│ d │', '│ c │'].join('\n');

    expect(normalize(output)).toBe(['│ a │', '│ b │', 'between', '│ c │', '│ d │'].join('\n'));
  });

  test('keeps error lines intact, after the gathered status block', () => {
    // `■`/`✖` are sequential, not concurrent, so they are excluded from the status family and never
    // sorted. An error originally interleaved with status output does land after the whole block:
    // which success line it fell between was a race, so that position was never assertable.
    const output = ['●  Fetching', '■  something failed', '◆  File a'].join('\n');

    expect(normalize(output)).toBe(['●  Fetching', '◆  File a', '■  something failed'].join('\n'));
  });
});
