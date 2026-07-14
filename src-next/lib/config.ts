import { z } from 'zod';
import InvalidConfigurationError from './config/errors/InvalidConfigurationError.ts';
import { languagePatterns } from './export/patterns.ts';

// Accepted base_url hosts, ported from Java PropertiesBeanUtils.isUrlOfficial / isUrlForTesting.
const BASE_URL_PATTERNS = [
  /^https:\/\/[^.]+\.(api\.)?crowdin\.com$/, // <org>.crowdin.com, <org>.api.crowdin.com (enterprise)
  /^https:\/\/(api\.)?crowdin\.com$/, // crowdin.com, api.crowdin.com (official)
  /^https:\/\/[^.]+\.crowdin\.dev$/,
  /^https:\/\/[^.]+\.[^.]+\.crowdin\.dev$/,
  /^https:\/\/.+\.test\.crowdin\.com$/,
  /^https:\/\/.+\.e-test\.crowdin\.com$/,
];

// Documented config `update_option` values → API enum (Java PropertiesBeanUtils.getUpdateOption).
const UPDATE_OPTION_MAP = {
  update_as_unapproved: 'keep_translations',
  update_without_changes: 'keep_translations_and_approvals',
} as const;

// Strips a trailing /api, /api/v2, or slash (Java BaseProperties normalizes with removePattern).
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/(api(\/|\/v2\/?)?)?$/, '');
}

// Java coerces booleans via setBooleanPropertyIfExists ("1" -> true, else Boolean.valueOf),
// so accept 0/1 and their string forms in addition to real booleans.
const coercedBoolean = z.preprocess((value) => {
  if (value === 1 || value === '1' || value === true || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === false || value === 'false') {
    return false;
  }

  return value;
}, z.boolean());

export const ConfigSchema = z
  .object({
    projectId: z.coerce.number().gt(0),
    apiToken: z.string().min(80).optional(),
    basePath: z.string().default('.'),
    baseUrl: z
      .string()
      .default('https://api.crowdin.com')
      .transform(normalizeBaseUrl)
      .refine((url) => BASE_URL_PATTERNS.some((pattern) => pattern.test(url)), {
        error: 'base_url must be a Crowdin URL (e.g. https://api.crowdin.com or https://<org>.crowdin.com)',
      }),
    preserveHierarchy: coercedBoolean.default(false),
    ignoreHiddenFiles: coercedBoolean.default(true),
    exportLanguages: z.array(z.string()).optional(),
    pseudoLocalization: z
      .object({
        length_correction: z.number().min(-50).max(100).optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        character_transformation: z.enum(['asian', 'european', 'arabic', 'cyrillic']).optional(),
      })
      .optional(),
    // Optional: commands like `project list`, `language list`, `browse`, `context status` need only
    // credentials (Java used a fileless ProjectProperties). Defaults to [] so file-command consumers
    // and the superRefine below always see an array.
    files: z
      .array(
        z.object({
          source: z.string().refine((arg) => arg.length > 0, {
            error: 'source parameter cannot be empty',
            abort: true,
          }),
          ignore: z.array(z.string()).optional(),
          dest: z.string().optional(),
          labels: z.array(z.string()).optional(),
          excluded_target_languages: z.array(z.string()).optional(),
          translation: z
            .string()
            .refine((arg) => arg.length > 0, {
              error: 'translation parameter cannot be empty',
              abort: true,
            })
            .refine((arg) => !arg.includes('../'), {
              error: 'translation cannot contain "../"',
              abort: true,
            }),
          type: z.string().optional(),
          context: z.string().optional(),
          scheme: z.union([z.string(), z.record(z.string(), z.number())]).optional(),
          multilingual: coercedBoolean.optional(),
          // Parsed for Java config parity but inert (Java reads `multilingual` only; this field is never consumed).
          multilingual_spreadsheet: coercedBoolean.optional(),
          // Java parity: only the documented config values are accepted, normalized to the API enum.
          update_option: z
            .enum(Object.keys(UPDATE_OPTION_MAP) as [keyof typeof UPDATE_OPTION_MAP])
            .transform((value) => UPDATE_OPTION_MAP[value])
            .optional(),
          escape_quotes: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
          escape_special_characters: z.union([z.literal(0), z.literal(1)]).optional(),
          export_quotes: z.enum(['single', 'double']).optional(),
          first_line_contains_header: coercedBoolean.optional(),
          translate_content: coercedBoolean.optional(),
          translate_attributes: coercedBoolean.optional(),
          translatable_elements: z.array(z.string()).optional(),
          content_segmentation: coercedBoolean.optional(),
          custom_segmentation: z.string().optional(),
          import_translations: coercedBoolean.optional(),
          languages_mapping: z.record(z.string(), z.record(z.string(), z.string())).optional(),
          translation_replace: z.record(z.string(), z.string()).optional(),
          skip_untranslated_strings: coercedBoolean.optional(),
          skip_untranslated_files: coercedBoolean.optional(),
          export_only_approved: coercedBoolean.optional(),
          export_strings_that_passed_workflow: coercedBoolean.optional(),
        }),
      )
      .default([]),
  })
  .superRefine((config, ctx) => {
    config.files.forEach((file, index) => {
      if (file.dest && !config.preserveHierarchy) {
        ctx.addIssue({
          code: 'custom',
          message:
            "The 'dest' parameter only works for single files with the specified 'preserve_hierarchy': true option",
          path: ['files', index, 'dest'],
        });
      }

      // A language placeholder is required unless the file is multilingual — either via a `scheme`
      // or an explicit `multilingual: true` (mirrors Java FileBean.checkProperties).
      if (
        file.scheme === undefined &&
        !file.multilingual &&
        !languagePatterns.some((pattern) => file.translation.includes(pattern))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: "The 'translation' parameter should contain at least one language placeholder (e.g. %locale%)",
          path: ['files', index, 'translation'],
        });
      }

      if (file.skip_untranslated_strings && file.skip_untranslated_files) {
        ctx.addIssue({
          code: 'custom',
          message: 'You cannot skip strings and files at the same time. Please use one of these parameters instead.',
          path: ['files', index],
        });
      }
    });
  });

export type Config = z.infer<typeof ConfigSchema>;

// `files` is optional in the schema so credential-only commands (project list, browse, etc.) work.
// File commands (upload/download/config lint) must call this to restore Java's parity error
// (PropertiesWithFiles.checkProperties -> error.config.empty_or_missed_section_files).
export function assertFilesConfigured(config: Config): void {
  if (config.files.length === 0) {
    throw new InvalidConfigurationError("Required section 'files' is missing (or empty) in the configuration file");
  }
}
