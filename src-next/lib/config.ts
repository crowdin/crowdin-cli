import { z } from 'zod';
import { languagePatterns } from './export/patterns.ts';

export const ConfigSchema = z
  .object({
    projectId: z.coerce.number().gt(0),
    apiToken: z.string().min(80).optional(),
    basePath: z.string().default('.'),
    baseUrl: z.url({
      protocol: /^https?$/,
      hostname: /crowdin\.com$/,
    }),
    preserveHierarchy: z.boolean().default(false),
    ignoreHiddenFiles: z.boolean().default(true),
    exportLanguages: z.array(z.string()).optional(),
    pseudoLocalization: z
      .object({
        length_correction: z.number().min(-50).max(100).optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        character_transformation: z.enum(['asian', 'european', 'arabic', 'cyrillic']).optional(),
      })
      .optional(),
    files: z.array(
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
        multilingual: z.boolean().optional(),
        // Parsed for Java config parity but inert (Java reads `multilingual` only; this field is never consumed).
        multilingual_spreadsheet: z.boolean().optional(),
        update_option: z
          .enum(['clear_translations_and_approvals', 'keep_translations', 'keep_translations_and_approvals'])
          .optional(),
        escape_quotes: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
        escape_special_characters: z.union([z.literal(0), z.literal(1)]).optional(),
        export_quotes: z.enum(['single', 'double']).optional(),
        first_line_contains_header: z.boolean().optional(),
        translate_content: z.boolean().optional(),
        translate_attributes: z.boolean().optional(),
        translatable_elements: z.array(z.string()).optional(),
        content_segmentation: z.boolean().optional(),
        custom_segmentation: z.string().optional(),
        import_translations: z.boolean().optional(),
        languages_mapping: z.record(z.string(), z.record(z.string(), z.string())).optional(),
        translation_replace: z.record(z.string(), z.string()).optional(),
        skip_untranslated_strings: z.boolean().optional(),
        skip_untranslated_files: z.boolean().optional(),
        export_only_approved: z.boolean().optional(),
        export_strings_that_passed_workflow: z.boolean().optional(),
      }),
    ),
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
