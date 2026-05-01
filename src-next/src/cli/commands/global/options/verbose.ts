import type { OptionDef } from '../../../types.ts';

export default {
  name: 'verbose',
  short: 'v',
  type: 'boolean',
  description: 'Provide more information about command execution',
  default: false,
} as OptionDef;
