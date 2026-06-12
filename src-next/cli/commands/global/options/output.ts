import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'output',
  short: 'o',
  type: 'string',
  description: 'Change output format',
  default: 'text',
  choices: ['json', 'toon', 'text', 'plain'],
} as OptionDef;
