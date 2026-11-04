import type { OptionDef } from '@/cli/types.ts';

export const install = {
  manifestUrl: {
    name: 'manifest-url',
    type: 'string',
    description: 'Install from an https manifest URL instead of Crowdin Store, e.g. a private app',
  },
} satisfies Record<string, OptionDef>;

export const uninstall = {
  force: {
    name: 'force',
    type: 'boolean',
    description: 'Force to delete application installation',
  },
} satisfies Record<string, OptionDef>;

export const methods = {
  method: {
    name: 'method',
    short: 'X',
    type: 'string',
    description: 'Pick one of several HTTP methods declared for the same path',
  },
} satisfies Record<string, OptionDef>;

export const api = {
  method: {
    name: 'method',
    short: 'X',
    type: 'string',
    description: 'HTTP method: GET, POST, PUT, PATCH or DELETE',
  },
  field: {
    name: 'field',
    short: 'f',
    type: 'string',
    variadic: true,
    description: "Add a string field as key=value. Repeat 'key[]=value' to send an array",
  },
  typedField: {
    name: 'typed-field',
    short: 'F',
    type: 'string',
    variadic: true,
    description: 'Add a field as key=value, converting true, false, null and integers, and reading @file',
  },
  input: {
    name: 'input',
    type: 'string',
    description: "Read the JSON request body from a file, or '-' for stdin",
  },
  wait: {
    name: 'wait',
    type: 'boolean',
    description: 'Wait for the job the request starts, or the job-info request names, to end',
  },
} satisfies Record<string, OptionDef>;
