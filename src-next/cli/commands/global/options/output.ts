import type { OptionDef } from '@/cli/types.ts';

export default {
  name: 'output',
  short: 'o',
  type: 'string',
  description: 'Change output format',
  choices: ['json', 'toon', 'plain'],
} as OptionDef;
