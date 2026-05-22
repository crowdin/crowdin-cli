import { z } from 'zod';
import { languagePatterns } from './export/patterns.ts';

export const ConfigSchema = z.object({
  projectId: z.coerce.number().gt(0),
  apiToken: z.string().min(80),
  basePath: z.string().default('.'),
  baseUrl: z.url({
    protocol: /^https?$/,
    hostname: /crowdin\.com$/,
  }),
  preserveHierarchy: z.boolean().default(true),
  files: z.array(
    z.object({
      source: z.string().refine((arg) => arg.length > 0, {
        error: 'source parameter cannot be empty',
        abort: true,
      }),
      translation: z
        .string()
        .refine((arg) => arg.length > 0, {
          error: 'translation parameter cannot be empty',
          abort: true,
        })
        .refine((arg) => !arg.includes('../'), {
          error: 'translation cannot contain "../"',
          abort: true,
        })
        .refine(
          (arg) => {
            for (const pattern of languagePatterns) {
              if (arg.includes(pattern)) {
                return true;
              }
            }

            return false;
          },
          {
            error: "The 'translation' parameter should contain at least one language placeholder (e.g. %locale%)",
            abort: true,
          },
        ),
    }),
  ),
});

export type Config = z.infer<typeof ConfigSchema>;
