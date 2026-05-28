import CliError from '@/cli/errors/CliError.ts';

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
  return `/${value.replaceAll('\\', '/').replace(/^\/+/, '')}`;
}
