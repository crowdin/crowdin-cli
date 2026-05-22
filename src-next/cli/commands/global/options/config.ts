import type { OptionDef } from '../../../types.ts';

export default {
  name: 'config',
  short: 'c',
  type: 'string',
  description: 'Specify a path to the configuration file',
  default: 'crowdin.yml',
} as OptionDef;
