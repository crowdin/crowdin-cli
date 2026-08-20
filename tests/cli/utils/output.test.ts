import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { GlobalOptions } from '@/cli/options.ts';
import { createOutput, getOutputFormatFromArgs, uncoloredStdout, type View } from '@/cli/utils/output.ts';

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

describe('diagnostics', () => {
  const options = (output: string): GlobalOptions => ({
    colors: false,
    config: '',
    progress: false,
    verbose: false,
    output,
    debug: false,
  });

  // stdout carries the result document and nothing else, so a command that warns and then fails
  // still leaves parseable output behind.
  test.each(['json', 'toon', 'text', 'plain'])('keeps diagnostics off stdout in %s', (format) => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});

    const out = createOutput(options(format));

    out.warning('a warning');
    out.error('a failure');

    expect(log).not.toHaveBeenCalled();
  });

  test('emits one JSON object per diagnostic in machine formats', () => {
    const errors: string[] = [];

    spyOn(console, 'error').mockImplementation((line) => {
      errors.push(String(line));
    });

    const out = createOutput(options('json'));

    out.warning("Project doesn't contain the 'a.yml' file");
    out.error('No valid file specified for the task', { code: 1 });

    expect(errors.map((line) => JSON.parse(line))).toEqual([
      { level: 'warning', message: "Project doesn't contain the 'a.yml' file" },
      { level: 'error', message: 'No valid file specified for the task', code: 1 },
    ]);
    // One record per line: pretty-printing would spread a record over several and take the
    // newline separator with it. Parsing alone does not catch that — whitespace is legal JSON.
    expect(errors.every((line) => !line.includes('\n'))).toBe(true);
  });

  // toon records span lines, so a blank line ends each one. Newlines inside a message are
  // escaped by both formats, so neither separator can turn up inside a record.
  test('emits toon blocks separated by a blank line when the output format is toon', () => {
    const errors: string[] = [];

    spyOn(console, 'error').mockImplementation((line) => {
      errors.push(String(line));
    });

    const out = createOutput(options('toon'));

    out.warning('a warning');
    out.error('a failure', { code: 1 });

    // console.error appends the newline the spy does not capture, so add it back.
    expect(errors.map((line) => `${line}\n`).join('')).toBe(
      'level: warning\nmessage: a warning\n\nlevel: error\nmessage: a failure\ncode: 1\n\n',
    );
  });

  test('escapes a newline inside a message rather than ending the record', () => {
    const errors: string[] = [];

    spyOn(console, 'error').mockImplementation((line) => {
      errors.push(String(line));
    });

    createOutput(options('toon')).warning('first line\n\nsecond line');

    const stream = errors.map((line) => `${line}\n`).join('');

    // One record, so exactly one blank line: the separator at the end, none from the message.
    expect(stream.split('\n\n')).toHaveLength(2);
    expect(stream).toContain('\\n\\nsecond line');
  });

  // Warnings used to be dropped outside text, so --output consumers lost them silently.
  test('reports warnings in every format', () => {
    for (const format of ['json', 'toon', 'text', 'plain']) {
      const error = spyOn(console, 'error').mockImplementation(() => {});

      createOutput(options(format)).warning('a warning');

      expect(error).toHaveBeenCalledWith(expect.stringContaining('a warning'));
      error.mockRestore();
    }
  });

  test('leaves the symbol off the plain line', () => {
    const error = spyOn(console, 'error').mockImplementation(() => {});

    createOutput(options('plain')).error('a failure');

    expect(error).toHaveBeenCalledWith('a failure');
  });
});

describe('spinner colors', () => {
  const ESCAPE = '\u001b[';
  // Colour (SGR) sequences only — cursor and erase sequences are not colour.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is what an SGR sequence starts with
  const SGR = /\u001b\[[0-9;]*m/;

  const textOptions = (colors: boolean): GlobalOptions => ({
    colors,
    config: '',
    progress: true,
    verbose: false,
    output: 'text',
    debug: false,
  });

  // Everything clack styles — the animated frame, the settled symbol, and the line its own
  // SIGINT/exit handlers print — reaches the terminal through the spinner's output stream.
  async function runSpinner(colors: boolean, ending: 'stop' | 'cancel'): Promise<string> {
    const written: string[] = [];

    spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });

    // Off a TTY clack skips readline entirely, which hides every way the stream it is handed can
    // fall short of a real one — the reason a shim that only declared write/columns/isTTY passed
    // here and then threw on `output.on('resize')` in a terminal.
    const wasTTY = process.stdout.isTTY;

    process.stdout.isTTY = true;

    const output = createOutput(textOptions(colors));

    try {
      output.spinner('probe', 'start', 'Working');
      // Frames render on an interval, so yield long enough for at least one to be written.
      await Bun.sleep(200);
      output.spinner('probe', ending, ending === 'stop' ? 'Done' : 'Canceled');
    } finally {
      process.stdout.isTTY = wasTTY;
    }

    return written.join('');
  }

  test('emits no color escapes when colors are disabled', async () => {
    const output = await runSpinner(false, 'stop');

    expect(output).toContain('Done');
    expect(output).not.toMatch(SGR);
    // Cursor and erase sequences have to survive or the spinner scrolls instead of animating.
    expect(output).toContain(`${ESCAPE}?25l`);
  });

  // clack's cancel line comes from its own signal handlers, outside our spinner wrapper.
  test('emits no color escapes when a spinner is cancelled', async () => {
    const output = await runSpinner(false, 'cancel');

    expect(output).toContain('Canceled');
    expect(output).not.toMatch(SGR);
  });

  test('keeps the colors when they are enabled', async () => {
    expect(await runSpinner(true, 'stop')).toMatch(SGR);
    expect(await runSpinner(true, 'cancel')).toMatch(SGR);
  });

  // On a TTY clack hands this stream to readline, which subscribes with output.on('resize') and
  // unsubscribes on close. A stream that only declares write/columns/isTTY passes every test
  // above — off a TTY clack never reaches readline — and then throws in a real terminal. Off-TTY
  // tests cannot reach that path, so assert the stream stays interchangeable with stdout instead.
  test.each(['write', 'on', 'off', 'once', 'removeListener', 'emit'])('forwards %s to the real stream', (method) => {
    expect(typeof (uncoloredStdout as unknown as Record<string, unknown>)[method]).toBe('function');
  });

  test('forwards the stream properties readline reads', () => {
    expect(uncoloredStdout.columns).toBe(process.stdout.columns);
    expect(uncoloredStdout.isTTY).toBe(process.stdout.isTTY);
  });

  // console.table bolds its header row on a TTY with no opt-out, which leaked past --no-colors.
  // Only visible on a terminal, so assert on the rendered string rather than on stdout.
  test('renders the grid without styling when colors are disabled', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    const grid = { af: { Translated: '0%' }, ar: { Translated: '5%' } };

    createOutput({ ...textOptions(false), progress: false }).table(grid);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('Translated'));
    expect(log).toHaveBeenCalledWith(expect.not.stringMatching(SGR));
  });
});
