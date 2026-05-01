import type { OptionDef } from '../../../types.ts';

export default {
  name: 'destination',
  short: 'd',
  type: 'string',
  default: 'crowdin.yml',
  description: 'Place where the configuration skeleton should be saved',
} as OptionDef;
