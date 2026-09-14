import ValidationError from '@/cli/errors/ValidationError.ts';
import { stripLeadingSlashes, stripTrailingSlashes, toPosixPath } from '@/lib/utils/path.ts';

// Anything but an optionally signed run of digits is a usage error (exit 2). `Number()` alone is far
// looser — it accepts '1.5', '1e3', '0x10', ' 12 ' and 'Infinity', and turns '  ' into 0 — which
// would forward junk to the API as a real id.
export function parseNumericId(value: string | undefined, entityName: string): number {
  if (!value) {
    throw new ValidationError(`${entityName} id can not be empty`);
  }

  if (!/^[+-]?\d+$/.test(value)) {
    throw new ValidationError(`${entityName} id must be numeric`);
  }

  return Number(value);
}

export function toArray<T = string>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === '') {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

type NumericInput = string | number | Array<string | number> | undefined;

export function toNumberArray(value: NumericInput, errorMessage: string): number[] {
  if (value === undefined || value === '') {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values.map((entry) => {
    // String input is held to the same grammar as parseNumericId.
    if (typeof entry === 'number') {
      return entry;
    }

    if (!/^[+-]?\d+$/.test(entry)) {
      throw new ValidationError(errorMessage);
    }

    return Number(entry);
  });
}

// Server paths never carry a trailing separator, so a path typed as 'en/' has to lose it before it
// can be compared against one — otherwise '--directory en/' matches nothing.
export function normalizePath(value: string): string {
  return `/${stripTrailingSlashes(stripLeadingSlashes(toPosixPath(value)))}`;
}

// Symbols that are not allowed in Crowdin branch names are replaced with dots
export function normalizeBranchName(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, '.');
}

export function parseScheme(values: string[]): Record<string, number> | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const scheme: Record<string, number> = {};

  for (const value of values.flatMap((entry) => entry.split(','))) {
    const [key, column, ...rest] = value.split('=');
    const index = Number(column);

    // `!column`, not `column === undefined`: `Number('')` is 0, so 'en=' would otherwise clear the
    // integer guard and silently mean column 0 — the first real column.
    if (!key || !column || rest.length > 0 || !Number.isInteger(index) || index < 0) {
      // A usage error (exit 2) rather than a generic failure.
      throw new ValidationError(
        `The '--scheme' parameter has an invalid value '${value}'. Expected format: <column>=<index> (e.g. en=0)`,
      );
    }

    scheme[key] = index;
  }

  return scheme;
}
