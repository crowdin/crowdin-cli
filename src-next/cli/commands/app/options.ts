import type { OptionDef } from '@/cli/types.ts';

export const force: OptionDef = {
  name: 'force',
  type: 'boolean',
  description: 'Force to delete application installation',
};

export const method: OptionDef = {
  name: 'method',
  short: 'X',
  type: 'string',
  description: 'HTTP method: GET, POST, PUT, PATCH or DELETE',
};

export const field: OptionDef = {
  name: 'field',
  short: 'f',
  type: 'string',
  variadic: true,
  description: "Add a string field as key=value. Repeat 'key[]=value' to send an array",
};

export const typedField: OptionDef = {
  name: 'typed-field',
  short: 'F',
  type: 'string',
  variadic: true,
  description: 'Add a field as key=value, converting true, false, null and integers, and reading @file',
};

export const input: OptionDef = {
  name: 'input',
  type: 'string',
  description: "Read the JSON request body from a file, or '-' for stdin",
};
