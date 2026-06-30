import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { OptionDef } from '@/cli/types.ts';

const BRANCH_PRIORITIES: SourceFilesModel.Priority[] = ['low', 'normal', 'high'];

export const addTitle: OptionDef = {
  name: 'title',
  type: 'string',
  description: 'Provide more details for translators. The title is available in UI only',
};

export const exportPattern: OptionDef = {
  name: 'export-pattern',
  type: 'string',
  description: 'Branch export pattern. Defines branch name and path in resulting translations bundle',
};

export const addPriority: OptionDef = {
  name: 'priority',
  type: 'string',
  description: 'Defines priority level for each branch',
  choices: [...BRANCH_PRIORITIES],
};

export const newName: OptionDef = {
  name: 'name',
  type: 'string',
  description: 'Rename branch',
};

export const editTitle: OptionDef = {
  name: 'title',
  type: 'string',
  description: 'Specify new title for the branch',
};

export const editPriority: OptionDef = {
  name: 'priority',
  type: 'string',
  description: 'Specify new priority for the branch',
  choices: [...BRANCH_PRIORITIES],
};

export const dryrun: OptionDef = {
  name: 'dryrun',
  type: 'boolean',
  description: 'Simulate merging without making any real changes',
};

export const deleteAfterMerge: OptionDef = {
  name: 'delete-after-merge',
  type: 'boolean',
  description: 'Whether to delete branch after merge',
};
