import { readFileSync } from 'node:fs';
import CliError from '@/cli/errors/CliError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';

type FieldValue = string | number | boolean | null;

export type Fields = Record<string, FieldValue | FieldValue[]>;

type ReadText = (path: string) => string;

const readText: ReadText = (path) => readFileSync(path, 'utf8');

/**
 * `-f` values stay strings, `-F` values are coerced. A key ending in `[]` collects into an array, so one
 * item and several take the same shape; a plain key given twice is rejected rather than guessed at.
 */
export function parseFields(raw: string[], typed: string[], read: ReadText = readText): Fields {
  const fields = new Map<string, FieldValue | FieldValue[]>();
  const entries = [
    ...raw.map((field) => ({ field, coerce: false })),
    ...typed.map((field) => ({ field, coerce: true })),
  ];
  for (const { field, coerce } of entries) {
    const separator = field.indexOf('=');
    const key = separator === -1 ? '' : field.slice(0, separator);

    if (separator === -1 || key === '' || key === '[]') {
      throw new ValidationError(`Invalid field '${field}'. Use key=value`);
    }

    const text = field.slice(separator + 1);
    const value = coerce ? coerceValue(text, read) : text;

    if (key.endsWith('[]')) {
      const name = key.slice(0, -2);
      const existing = fields.get(name);

      if (existing !== undefined && !Array.isArray(existing)) {
        throw new ValidationError(`Field '${name}' is given both as a value and as an array`);
      }

      fields.set(name, [...(existing ?? []), value]);
      continue;
    }

    if (fields.has(key)) {
      throw new ValidationError(`Field '${key}' is given more than once. Use '${key}[]=value' to send an array`);
    }

    fields.set(key, value);
  }

  return Object.fromEntries(fields);
}

function coerceValue(text: string, read: ReadText): FieldValue {
  if (text === 'true' || text === 'false') {
    return text === 'true';
  }

  if (text === 'null') {
    return null;
  }

  if (/^-?\d+$/.test(text)) {
    const number = Number(text);

    if (!Number.isSafeInteger(number)) {
      throw new ValidationError(`Number ${text} is too large to send exactly. Use -f to send it as a string`);
    }

    return number;
  }

  if (text.startsWith('@')) {
    const path = text.slice(1);

    try {
      return read(path);
    } catch (error) {
      throw new ValidationError(`Failed to read '@${path}': ${CliError.getErrorMessage(error)}`);
    }
  }

  return text;
}
