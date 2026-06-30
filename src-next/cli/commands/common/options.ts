import type { OptionDef, OptionGroupDef } from '@/cli/types.ts';

// Shared options used by 2+ commands. Command-specific options live in each command's own options.ts.

export const token: OptionDef = {
  name: 'token',
  short: 'T',
  type: 'string',
  description: 'Personal access token required for authentication',
};

export const baseUrl: OptionDef = {
  name: 'base-url',
  type: 'string',
  description: 'Base URL of Crowdin server for API requests execution',
  default: 'https://api.crowdin.com',
};

export const basePath: OptionDef = {
  name: 'base-path',
  type: 'string',
  description: 'Path to your project directory on a local machine',
};

export const projectId: OptionDef = {
  name: 'project-id',
  short: 'i',
  type: 'number',
  description: 'Numeric ID of the project',
};

export const source: OptionDef = {
  name: 'source',
  short: 's',
  type: 'string',
  description: 'Path to the source files',
};

export const translation: OptionDef = {
  name: 'translation',
  short: 't',
  type: 'string',
  description: 'Path to the translation files',
};

// Config-options `--dest` for file-based commands. Distinct from init's `destination` (which saves the
// config skeleton, defaulting to crowdin.yml): here it overrides the in-project file destination, so it
// must have no default — otherwise the value would always override the configured `dest`.
export const destination: OptionDef = {
  name: 'destination',
  short: 'd',
  type: 'string',
  description: 'Specify file name in Crowdin',
};

export const noPreserveHierarchy: OptionDef = {
  name: 'no-preserve-hierarchy',
  type: 'boolean',
  default: true,
  description: 'Choose whether to save the directory hierarchy in the Crowdin project',
};

export const dryRun: OptionDef = {
  // Matches the Java CLI flag spelling (`--dryrun`); Commander exposes it as `options.dryrun`.
  name: 'dryrun',
  type: 'boolean',
  description: 'Print a command output without execution',
};

export const tree: OptionDef = {
  name: 'tree',
  type: 'boolean',
  default: false,
  description: 'List contents of directories in a tree-like format in dryrun mode',
};

export const branch: OptionDef = {
  name: 'branch',
  short: 'b',
  type: 'string',
  default: 'none',
  description: 'Specify branch name',
};

// Config option tiers, mirroring the Java picocli param tiers (BaseParams -> ProjectParams -> ParamsWithFiles).
// Each tier is defined once here so a command never drifts from its expected option set.
const baseConfigOptions = [token, baseUrl, basePath];
const projectConfigOptions = [...baseConfigOptions, projectId];
const filesConfigOptions = [...projectConfigOptions, source, translation, destination, noPreserveHierarchy];

// BaseParams: commands that talk to the API without a project context (tm, glossary).
export const baseConfigGroup: OptionGroupDef = { group: 'Config options:', options: baseConfigOptions };

// ProjectParams: project-scoped commands (branch, file, string, task, ...).
export const projectConfigGroup: OptionGroupDef = { group: 'Config options:', options: projectConfigOptions };

// ParamsWithFiles: file-based commands (upload, download, auto-translate, config).
export const filesConfigGroup: OptionGroupDef = { group: 'Config options:', options: filesConfigOptions };
