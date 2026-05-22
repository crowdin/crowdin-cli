import type { OptionDef } from '../../../types.ts';

export default {
  name: 'excluded-language',
  type: 'string',
  description: 'Specify languages the sources should not be translated into. Can be specified multiple times',
} as OptionDef;
