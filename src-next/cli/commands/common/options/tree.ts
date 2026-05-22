import type { OptionDef } from '../../../types.ts';

export default {
  name: 'tree',
  type: 'boolean',
  default: false,
  description: 'List contents of directories in a tree-like format in dryrun mode',
} as OptionDef;
