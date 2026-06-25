import destination from '@/cli/commands/common/options/destination.ts';
import basePath from '@/cli/commands/init/options/basePath.ts';
import baseUrl from '@/cli/commands/init/options/baseUrl.ts';
import noPreserveHierarchy from '@/cli/commands/init/options/noPreserveHierarchy.ts';
import projectId from '@/cli/commands/init/options/projectId.ts';
import source from '@/cli/commands/init/options/source.ts';
import token from '@/cli/commands/init/options/token.ts';
import translation from '@/cli/commands/init/options/translation.ts';
import type { OptionGroupDef } from '@/cli/types.ts';

// Mirrors the Java picocli param tiers (BaseParams -> ProjectParams -> ParamsWithFiles).
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
