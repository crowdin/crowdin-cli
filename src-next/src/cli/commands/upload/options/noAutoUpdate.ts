import type { OptionDef } from '../../../types.ts';

export default {
  name: 'no-auto-update',
  type: 'boolean',
  description:
    'Specify whether to update existing source files in the Crowdin project or only upload new ones. Updates by default',
} as OptionDef;
