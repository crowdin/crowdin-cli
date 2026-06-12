import { z } from 'zod';

export const IdentitySchema = z.object({
  projectId: z.coerce.number().gt(0).optional(),
  apiToken: z.string().min(80).optional(),
  basePath: z.string().optional(),
  baseUrl: z.string().optional(),
});

export type Identity = z.infer<typeof IdentitySchema>;
