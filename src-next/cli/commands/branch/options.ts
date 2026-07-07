import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { OptionDef } from '@/cli/types.ts';

const BRANCH_PRIORITIES: SourceFilesModel.Priority[] = ['low', 'normal', 'high'];

// add/edit both take --title and --priority but with different wording
// (Java crowdin.branch.<sub>.*), so grouped per subcommand.

export const add = {
  title: {
    name: 'title',
    type: 'string',
    description: 'Provide more details for translators. The title is available in UI only',
  },
  exportPattern: {
    name: 'export-pattern',
    type: 'string',
    description: 'Branch export pattern. Defines branch name and path in resulting translations bundle',
  },
  priority: {
    name: 'priority',
    type: 'string',
    description: 'Defines priority level for each branch',
    choices: [...BRANCH_PRIORITIES],
  },
} satisfies Record<string, OptionDef>;

export const edit = {
  name: {
    name: 'name',
    type: 'string',
    description: 'Rename branch',
  },
  title: {
    name: 'title',
    type: 'string',
    description: 'Specify new title for the branch',
  },
  priority: {
    name: 'priority',
    type: 'string',
    description: 'Specify new priority for the branch',
    choices: [...BRANCH_PRIORITIES],
  },
} satisfies Record<string, OptionDef>;

export const merge = {
  dryrun: {
    name: 'dryrun',
    type: 'boolean',
    description: 'Simulate merging without making any real changes',
  },
  deleteAfterMerge: {
    name: 'delete-after-merge',
    type: 'boolean',
    description: 'Whether to delete branch after merge',
  },
} satisfies Record<string, OptionDef>;
