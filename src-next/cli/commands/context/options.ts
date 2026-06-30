import type { OptionDef } from '@/cli/types.ts';

const DEFAULT_CONTEXT_FILE = 'crowdin-context.jsonl';

export const to: OptionDef = {
  name: 'to',
  type: 'string',
  default: DEFAULT_CONTEXT_FILE,
  description: `File path to download the context to. Default: ${DEFAULT_CONTEXT_FILE}`,
};

export const fileFilter: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  variadic: true,
  description: 'Filter strings by Crowdin file paths (glob) (multiple paths can be specified)',
};

export const labelFilter: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Filter strings by labels (multiple labels can be specified)',
};

export const branchFilter: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  description: 'Filter by branch name',
};

export const croql: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'CroQL expression',
};

export const since: OptionDef = {
  name: 'since',
  type: 'string',
  description: 'Only strings created after this date (YYYY-MM-DD)',
};

export const status: OptionDef = {
  name: 'status',
  type: 'string',
  description: 'Filter by context status. Supported values: empty, ai, manual',
};

export const from: OptionDef = {
  name: 'from',
  type: 'string',
  default: DEFAULT_CONTEXT_FILE,
  description: `The file path to upload the context from. Only files previously downloaded by the context download command are supported. Default: ${DEFAULT_CONTEXT_FILE}`,
};

export const overwrite: OptionDef = {
  name: 'overwrite',
  type: 'boolean',
  description: 'Also update strings where ai_context is empty (removes their AI section). Default: false',
};

export const dryrun: OptionDef = {
  name: 'dryrun',
  type: 'boolean',
  description: 'Preview changes without applying them',
};

export const resetFile: OptionDef = {
  name: 'file',
  short: 'f',
  type: 'string',
  variadic: true,
  description: 'Only reset strings from matching file paths (multiple paths can be specified)',
};

export const resetLabel: OptionDef = {
  name: 'label',
  type: 'string',
  variadic: true,
  description: 'Only reset strings from matching labels (multiple labels can be specified)',
};

export const resetBranch: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  description: 'Only reset strings from matching branch',
};

export const resetCroql: OptionDef = {
  name: 'croql',
  type: 'string',
  description: 'Only reset strings from matching CroQL expression',
};

export const resetSince: OptionDef = {
  name: 'since',
  type: 'string',
  description: 'Only reset strings that were created after this date (YYYY-MM-DD)',
};

export const all: OptionDef = {
  name: 'all',
  type: 'boolean',
  description: 'Required safety flag when no filter is specified',
};

export const byFile: OptionDef = {
  name: 'by-file',
  type: 'boolean',
  description: 'Break down stats per file',
};
