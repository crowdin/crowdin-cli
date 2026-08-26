import type { OptionDef } from '@/cli/types.ts';

const DEFAULT_CONTEXT_FILE = 'crowdin-context.jsonl';

export const to: OptionDef = {
  name: 'to',
  type: 'string',
  default: DEFAULT_CONTEXT_FILE,
  description: `File path to download the context to. Default: ${DEFAULT_CONTEXT_FILE}`,
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

export const status: OptionDef = {
  name: 'status',
  type: 'string',
  description: 'Filter by context status. Supported values: empty, ai, manual',
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

// download + status share the same string-filter set; reset uses its own wording
// (Java crowdin.context.reset.*). Grouped so each flag's wording sits together.
export const filter = {
  file: {
    name: 'file',
    short: 'f',
    type: 'string',
    variadic: true,
    description: 'Filter strings by Crowdin file paths (glob) (multiple paths can be specified)',
  },
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: 'Filter strings by labels (multiple labels can be specified)',
  },
  branch: {
    name: 'branch',
    short: 'b',
    type: 'string',
    description: 'Filter by branch name',
  },
  croql: {
    name: 'croql',
    type: 'string',
    description: 'CroQL expression',
  },
  since: {
    name: 'since',
    type: 'string',
    description: 'Only strings created after this date (YYYY-MM-DD)',
  },
} satisfies Record<string, OptionDef>;

export const reset = {
  file: {
    name: 'file',
    short: 'f',
    type: 'string',
    variadic: true,
    description: 'Only reset strings from matching file paths (multiple paths can be specified)',
  },
  label: {
    name: 'label',
    type: 'string',
    variadic: true,
    description: 'Only reset strings from matching labels (multiple labels can be specified)',
  },
  branch: {
    name: 'branch',
    short: 'b',
    type: 'string',
    description: 'Only reset strings from matching branch',
  },
  croql: {
    name: 'croql',
    type: 'string',
    description: 'Only reset strings from matching CroQL expression',
  },
  since: {
    name: 'since',
    type: 'string',
    description: 'Only reset strings that were created after this date (YYYY-MM-DD)',
  },
} satisfies Record<string, OptionDef>;
