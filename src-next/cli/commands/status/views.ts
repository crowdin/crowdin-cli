import type { TranslationStatusModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

export type ProgressView = 'all' | 'translated' | 'proofread';

/** The percent map every format serializes: `{ translation: { uk: '87%' }, proofread: { … } }`. */
export type ProgressMap = Record<string, Record<string, string>>;

/** One language's progress, with the 100%-when-nothing-to-translate rule already applied. */
export interface ProgressRow {
  languageId: string;
  name: string;
  translation: number;
  approval: number;
  words?: TranslationStatusModel.Words;
  phrases?: TranslationStatusModel.Words;
}

const showsTranslated = (show: ProgressView): boolean => show === 'all' || show === 'translated';
const showsProofread = (show: ProgressView): boolean => show === 'all' || show === 'proofread';

/**
 * Java StatusAction verbose view: a header per language, then the progress lines it applies to,
 * each with the word and phrase counts behind the percentage.
 *
 * The rows carry the rendering; the view's item is the percent map, which is what json/toon
 * serialize and which holds none of the counts these lines show.
 */
export const statusVerboseView = (rows: ProgressRow[], show: ProgressView): View<ProgressMap> => ({
  text: () =>
    rows
      .flatMap((row) => {
        const lines = [`${colors.yellow(row.name)}(${colors.yellow(row.languageId)}):`];

        if (showsTranslated(show)) {
          lines.push(
            `\tTranslated: ${row.translation}% ` +
              `(Words: ${row.words?.translated ?? 0}/${row.words?.total ?? 0}, ` +
              `Phrases: ${row.phrases?.translated ?? 0}/${row.phrases?.total ?? 0})`,
          );
        }

        if (showsProofread(show)) {
          lines.push(
            `\tProofread: ${row.approval}% ` +
              `(Words: ${row.words?.approved ?? 0}/${row.words?.total ?? 0}, ` +
              `Phrases: ${row.phrases?.approved ?? 0}/${row.phrases?.total ?? 0})`,
          );
        }

        return lines;
      })
      .join('\n'),
});

/**
 * Java StatusAction plain view: per-language "<lang> <percent>" lines, translated section then
 * proofread section, each headed only when both are shown (show=all).
 */
export const statusPlainView = (rows: ProgressRow[], show: ProgressView): View<ProgressMap> => ({
  text: () => {
    const lines: string[] = [];
    const both = show === 'all';

    if (showsTranslated(show)) {
      if (both) {
        lines.push('Translated:');
      }

      lines.push(...rows.map((row) => `${row.languageId} ${row.translation}`));
    }

    if (showsProofread(show)) {
      if (both) {
        lines.push('Proofread:');
      }

      lines.push(...rows.map((row) => `${row.languageId} ${row.approval}`));
    }

    return lines.join('\n');
  },
});

/** The grid `status` renders in text, keyed the way console.table wants it. */
export function toProgressMap(rows: ProgressRow[], show: ProgressView): ProgressMap {
  const progress: ProgressMap = {};

  for (const row of rows) {
    if (showsTranslated(show)) {
      progress.translation ??= {};
      progress.translation[row.languageId] = `${row.translation}%`;
    }

    if (showsProofread(show)) {
      progress.proofread ??= {};
      progress.proofread[row.languageId] = `${row.approval}%`;
    }
  }

  return progress;
}
