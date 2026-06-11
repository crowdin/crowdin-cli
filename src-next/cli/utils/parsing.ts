import CliError from '@/cli/errors/CliError.ts';
import { toPosixPath } from '@/lib/utils/path.ts';

export function parseNumericId(value: string | undefined, entityName: string): number {
  if (!value) {
    throw new CliError(`${entityName} id can not be empty`);
  }

  const id = Number(value);

  if (Number.isNaN(id)) {
    throw new CliError(`${entityName} id must be numeric`);
  }

  return id;
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
    const parsed = typeof entry === 'number' ? entry : Number(entry);

    if (Number.isNaN(parsed)) {
      throw new CliError(errorMessage);
    }

    return parsed;
  });
}

export function normalizePath(value: string): string {
  return `/${toPosixPath(value).replace(/^\/+/, '')}`;
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

    if (!key || column === undefined || rest.length > 0 || !Number.isInteger(index) || index < 0) {
      throw new CliError(
        `The '--scheme' parameter has an invalid value '${value}'. Expected format: <column>=<index> (e.g. en=0)`,
      );
    }

    scheme[key] = index;
  }

  return scheme;
}
