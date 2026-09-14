import type { View } from '@/cli/utils/output.ts';

/**
 * What became of one downloaded file. Text output streams its own per-file messages as the
 * download runs; this is the summary json/toon get instead, since `output.success` is text-only.
 *
 * Kept separate from upload's UploadedFile despite the identical shape: the action vocabularies
 * differ, and merging them would give each command a union naming outcomes it can never produce.
 */
export interface DownloadedFile {
  /** Path the file was written to, relative to base_path. */
  path: string;
  action: 'downloaded' | 'skipped';
  /** Why it was skipped; absent when the file was written. */
  reason?: string;
}

export const downloadedFileView: View<DownloadedFile> = {
  // text streams its own per-file messages and never renders this list.
  text: (file) => file.path,
  // Bare paths, one per line, the same as the dry-run listing.
  plain: (file) => file.path,
  keys: ['path', 'action', 'reason'],
};
