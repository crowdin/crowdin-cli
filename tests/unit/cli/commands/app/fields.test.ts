import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFields } from '@/cli/commands/app/fields.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';

const read = (path: string) => `contents of ${path}`;

describe('parseFields', () => {
  test('keeps -f values as strings', () => {
    expect(parseFields(['projectId=12', 'flag=true', 'empty='], [], read)).toEqual({
      projectId: '12',
      flag: 'true',
      empty: '',
    });
  });

  test('coerces -F values', () => {
    expect(
      parseFields([], ['yes=true', 'no=false', 'none=null', 'n=12', 'neg=-3', 'float=1.5', 'text=abc'], read),
    ).toEqual({ yes: true, no: false, none: null, n: 12, neg: -3, float: '1.5', text: 'abc' });
  });

  test('keeps the largest safe integers', () => {
    expect(parseFields([], ['max=9007199254740991', 'min=-9007199254740991'], read)).toEqual({
      max: Number.MAX_SAFE_INTEGER,
      min: Number.MIN_SAFE_INTEGER,
    });
  });

  test.each([['9007199254740992'], ['-9007199254740993'], ['1'.repeat(400)]])(
    'rejects the unsafe integer %p',
    (value) => {
      expect(() => parseFields([], [`id=${value}`], read)).toThrow(
        new ValidationError(`Number ${value} is too large to send exactly. Use -f to send it as a string`),
      );
    },
  );

  test('keeps large integers as strings with -f', () => {
    expect(parseFields(['id=9007199254740993'], [], read)).toEqual({ id: '9007199254740993' });
  });

  test('reads @file through the reader', () => {
    expect(parseFields([], ['body=@notes.txt'], read)).toEqual({ body: 'contents of notes.txt' });
  });

  test('reads @file from disk by default', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'crowdin-app-field-')), 'note.txt');
    writeFileSync(path, 'from disk');

    expect(parseFields([], [`body=@${path}`])).toEqual({ body: 'from disk' });
  });

  test('does not read files for -f', () => {
    expect(parseFields(['handle=@me'], [], read)).toEqual({ handle: '@me' });
  });

  test('splits at the first equals sign', () => {
    expect(parseFields(['q=a=b'], [], read)).toEqual({ q: 'a=b' });
  });

  test('collects a single [] value into an array', () => {
    expect(parseFields(['entryIds[]=a'], [], read)).toEqual({ entryIds: ['a'] });
  });

  test('collects several [] values across -f and -F', () => {
    expect(parseFields(['ids[]=a', 'ids[]=b'], ['ids[]=3'], read)).toEqual({ ids: ['a', 'b', 3] });
  });

  test('rejects a key given both as a value and as an array', () => {
    expect(() => parseFields(['ids=a', 'ids[]=b'], [], read)).toThrow(
      new ValidationError("Field 'ids' is given both as a value and as an array"),
    );
  });

  test('rejects a plain key given twice', () => {
    expect(() => parseFields(['entryIds=a', 'entryIds=b'], [], read)).toThrow(
      new ValidationError("Field 'entryIds' is given more than once. Use 'entryIds[]=value' to send an array"),
    );
  });

  test('accepts keys that shadow Object.prototype', () => {
    expect(parseFields(['constructor=x', 'valueOf[]=1', 'toString=y'], [], read)).toEqual({
      constructor: 'x',
      valueOf: ['1'],
      toString: 'y',
    });
  });

  test('keeps __proto__ as a plain field', () => {
    const fields = parseFields(['__proto__=x'], [], read);

    expect(JSON.stringify(fields)).toBe('{"__proto__":"x"}');
    expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
  });

  test('collects __proto__[] values without touching the prototype', () => {
    const fields = parseFields(['__proto__[]=v', '__proto__[]=w'], [], read);

    expect(JSON.stringify(fields)).toBe('{"__proto__":["v","w"]}');
    expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
  });

  test('rejects __proto__ given twice', () => {
    expect(() => parseFields(['__proto__=x', '__proto__=y'], [], read)).toThrow(
      new ValidationError("Field '__proto__' is given more than once. Use '__proto__[]=value' to send an array"),
    );
  });

  test('names the file it failed to read', () => {
    const failing = () => {
      throw new Error('ENOENT: no such file or directory');
    };

    expect(() => parseFields([], ['body=@missing.json'], failing)).toThrow(
      new ValidationError("Failed to read '@missing.json': ENOENT: no such file or directory"),
    );
  });

  test.each([['noequals'], ['=value'], ['[]=value']])('rejects %p', (field) => {
    expect(() => parseFields([field], [], read)).toThrow(ValidationError);
  });
});
