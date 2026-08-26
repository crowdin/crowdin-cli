import type { View } from '@/cli/utils/output.ts';

// Java Dryrun.run prints one path per line (message.file_path is a bare '%s'). Shared by the
// config listings and the dry-run path listings, whose items are the paths themselves.
export const pathView: View<string> = {
  text: (path) => path,
  plain: (path) => path,
};

export const toSingleLine = (text: string): string => text.replaceAll('\n', ' ');
