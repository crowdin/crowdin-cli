import type { OptionDef } from '@/cli/types.ts';

export const action: OptionDef = {
  name: 'action',
  type: 'string',
  choices: ['pre_translate', 'alignment', 'qa_check'],
  description: 'Show only the prompts for the given action',
};
