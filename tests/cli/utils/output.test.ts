import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { GlobalOptions } from '@/cli/options.ts';
import { createOutput, getOutputFormatFromArgs, type View } from '@/cli/utils/output.ts';

describe('getOutputFormat', () => {
  test('defaults to text when no output flag is present', () => {
    expect(getOutputFormatFromArgs(['file', 'upload']).output).toBe('text');
  });

  test('reads a spaced --output value', () => {
    expect(getOutputFormatFromArgs(['--output', 'plain']).output).toBe('plain');
  });

  test('reads the -o short flag', () => {
    expect(getOutputFormatFromArgs(['-o', 'json']).output).toBe('json');
  });

  test('reads an --output=value form', () => {
    expect(getOutputFormatFromArgs(['--output=toon']).output).toBe('toon');
  });

  test('ignores an unknown output value and keeps the default', () => {
    expect(getOutputFormatFromArgs(['--output', 'xml']).output).toBe('text');
  });
});

describe('machine output keys', () => {
  type Entity = { id: number; name: string; secret?: string; extra?: number };

  const globalOptions: GlobalOptions = {
    colors: false,
    config: '',
    progress: false,
    verbose: false,
    output: 'json',
    debug: false,
  };

  const view: View<Entity> = { text: (entity) => entity.name, keys: ['id', 'name'] };

  afterEach(() => {
    (console.log as ReturnType<typeof spyOn>).mockRestore?.();
  });

  test('keeps only the view keys in a list', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});

    createOutput(globalOptions).list([{ id: 1, name: 'main', secret: 'hidden' }], view);

    expect(log).toHaveBeenCalledWith(JSON.stringify([{ id: 1, name: 'main' }], null, 2));
  });

  test('keeps only the view keys in a single item', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});

    createOutput(globalOptions).item({ id: 2, name: 'dev', secret: 'hidden' }, view);

    expect(log).toHaveBeenCalledWith(JSON.stringify({ id: 2, name: 'dev' }, null, 2));
  });

  test('fills a missing key with null so every row carries the same keys', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    const verboseView: View<Entity> = { text: (entity) => entity.name, keys: ['id', 'name', 'extra'] };

    createOutput(globalOptions).list(
      [
        { id: 1, name: 'main', extra: 7 },
        { id: 2, name: 'dev' },
      ],
      verboseView,
    );

    expect(log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { id: 1, name: 'main', extra: 7 },
          { id: 2, name: 'dev', extra: null },
        ],
        null,
        2,
      ),
    );
  });

  test('serializes the item whole when the view declares no keys', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});

    createOutput(globalOptions).list(['src/main.json'], { text: (path) => path });

    expect(log).toHaveBeenCalledWith(JSON.stringify(['src/main.json'], null, 2));
  });
});
