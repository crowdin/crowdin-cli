import type { View } from '@/cli/utils/output.ts';

// Java Dryrun.run prints one path per line (message.file_path is a bare '%s'). Shared by the
// config listings and the dry-run path listings, whose items are the paths themselves.
export const pathView: View<string> = {
  text: (path) => path,
  plain: (path) => path,
};

// Java message.downloaded_file ('%s' downloaded successfully): glossary and tm both echo the file
// they wrote. plain prints the bare path — the only place a script can learn it, since the default
// target is derived from the entity's name ('%name%.tbx') and never echoed anywhere else.
export const downloadedPathView: View<string> = {
  text: (writtenPath) => `'${writtenPath}' downloaded successfully`,
  plain: (writtenPath) => writtenPath,
};

export const toSingleLine = (text: string): string => text.replaceAll('\n', ' ');
