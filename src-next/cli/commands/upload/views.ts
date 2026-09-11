import type { View } from '@/cli/utils/output.ts';

/**
 * What became of one uploaded file, source or translation. Text output streams its own per-file
 * messages as the upload runs; this is the summary json/toon get instead, since `output.success`
 * is text-only.
 */
export interface UploadedFile {
  /** Project path for a source, local translation path for a translation. */
  path: string;
  action: 'created' | 'updated' | 'uploaded' | 'skipped';
  /** Why it was skipped; absent for the other actions. */
  reason?: string;
}

export const uploadedFileView: View<UploadedFile> = {
  // text streams its own per-file messages and never renders this list.
  text: (file) => file.path,
  plain: (file) => file.path,
  keys: ['path', 'action', 'reason'],
};
