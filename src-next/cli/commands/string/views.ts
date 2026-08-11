import type { SourceStringsModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

export type StringViewContext = {
  verbose: boolean;
  isStringsBased: boolean;
  labels: Map<number, string>;
  filePaths: Map<number, string>;
};

export function extractText(entry: SourceStringsModel.String): string {
  const text = entry.text;

  if (typeof text === 'string') {
    return text;
  }

  if (!text || typeof text !== 'object') {
    return '';
  }

  return text.one ?? text.other ?? Object.values(text)[0] ?? '';
}

/**
 * Java StringListAction.printSourceString: a headline plus, when verbose, indented file/labels/
 * context lines. The detail lines are the same in text and plain — only the headline differs —
 * and they need the label and file-path lookups, so the view is built per invocation.
 */
export function createStringView({
  verbose = false,
  isStringsBased = false,
  labels = new Map<number, string>(),
  filePaths = new Map<number, string>(),
}: Partial<StringViewContext> = {}): View<SourceStringsModel.String> {
  const details = (entry: SourceStringsModel.String): string[] => {
    if (!verbose) {
      return [];
    }

    const lines: string[] = [];

    if (!isStringsBased && entry.fileId !== undefined) {
      lines.push(`\t- file: ${filePaths.get(entry.fileId) ?? ''}`);
    }

    const entryLabels = (entry.labelIds ?? [])
      .map((id) => labels.get(id))
      .filter(Boolean)
      .join(', ');

    if (entryLabels) {
      lines.push(`\t- labels: ${entryLabels}`);
    }

    if (entry.context != null) {
      lines.push(`\t- context: ${entry.context.trim().replaceAll('\n', '\n\t\t')}`);
    }

    return lines;
  };

  return {
    text: (entry) =>
      [
        entry.identifier
          ? `#${entry.id} ${entry.identifier} ${extractText(entry)}`
          : `#${entry.id} ${extractText(entry)}`,
        ...details(entry),
      ].join('\n'),
    plain: (entry) => [String(entry.id), ...details(entry)].join('\n'),
  };
}
