import type { OptionDef } from '../../../types.ts';

export default {
  name: 'delete-obsolete',
  type: 'boolean',
  description:
    'Delete obsolete files and folders from the Crowdin project that no longer match the source configuration or have been deleted locally',
} as OptionDef;
