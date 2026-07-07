import type { OptionDef } from '@/cli/types.ts';

// upload/download both take --dest but with different wording (Java crowdin.file.<sub>.dest),
// so grouped per subcommand to keep each flag's wording together.

export const upload = {
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: 'Attach labels to strings (multiple labels can be specified)',
  },
  dest: {
    name: 'dest',
    short: 'd',
    type: 'string',
    description: 'File destination in the Crowdin project',
  },
  type: {
    name: 'type',
    type: 'string',
    description: 'File type',
  },
  parserVersion: {
    name: 'parser-version',
    type: 'string',
    description: "Parser version. Must be used together with the 'type' option",
  },
} satisfies Record<string, OptionDef>;

export const download = {
  dest: {
    name: 'dest',
    short: 'd',
    type: 'string',
    description: 'Path where the downloaded file should be saved',
  },
} satisfies Record<string, OptionDef>;
