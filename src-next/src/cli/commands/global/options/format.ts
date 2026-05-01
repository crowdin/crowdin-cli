import type { OptionDef } from '../../../types.ts';

export default {
  name: 'format',
  short: 'f',
  type: 'string',
  description: 'Change output format',
  default: 'text',
  choices: ['json', 'toon', 'text'],
} as OptionDef;
