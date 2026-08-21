import type { View } from '@/cli/utils/output.ts';

/**
 * What became of one source file. Text output streams its own per-file messages as the upload
 * runs; this is the summary json/toon get instead, since `output.success` is text-only and those
 * formats otherwise saw an empty stdout for a command that did real work.
 */
export interface UploadedSource {
  /** Branch-prefixed project path, matching the per-file messages in text. */
  path: string;
  action: 'created' | 'updated' | 'uploaded' | 'skipped';
  /** Why it was skipped; absent for the other actions. */
  reason?: string;
}

export const uploadedSourceView: View<UploadedSource> = {
  // text streams its own per-file messages and never renders this list.
  text: (source) => source.path,
  // Java's UploadSourcesAction prints the bare path under --plain (`out.println(fileFullPath)`)
  // where it would otherwise print `OK.withIcon("Uploading file %s")`.
  plain: (source) => source.path,
  keys: ['path', 'action', 'reason'],
};
