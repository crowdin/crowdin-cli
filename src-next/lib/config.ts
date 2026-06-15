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

      // A language placeholder is required unless a `scheme` defines a multilingual file (Java parity).
      if (file.scheme === undefined && !languagePatterns.some((pattern) => file.translation.includes(pattern))) {
        ctx.addIssue({
          code: 'custom',
          message: "The 'translation' parameter should contain at least one language placeholder (e.g. %locale%)",
          path: ['files', index, 'translation'],
        });
      }
    });
  });

export type Config = z.infer<typeof ConfigSchema>;
