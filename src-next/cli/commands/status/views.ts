import type { TranslationStatusModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

export interface ProgressEntry {
  language: string;
  translation?: number;
  approval?: number;
  translatedWords?: number;
  approvedWords?: number;
  totalWords?: number;
  translatedPhrases?: number;
  approvedPhrases?: number;
  totalPhrases?: number;
}

export interface ProgressRow {
  languageId: string;
  name: string;
  translation: number;
  approval: number;
  words?: TranslationStatusModel.Words;
  phrases?: TranslationStatusModel.Words;
}

export type ProgressView = 'all' | 'translated' | 'proofread';

type PlainSection = [title: string, value: (row: ProgressRow) => string];

const showsTranslated = (show: ProgressView): boolean => show === 'all' || show === 'translated';
const showsProofread = (show: ProgressView): boolean => show === 'all' || show === 'proofread';

export const statusPlainView = (rows: ProgressRow[], show: ProgressView, verbose = false): View<ProgressEntry[]> => ({
  text: () => {
    const sections: PlainSection[] = [];

    if (showsTranslated(show)) {
      sections.push(['Translated', (row) => `${row.translation}`]);

      if (verbose) {
        sections.push(
          ['Translated words', (row) => `${row.words?.translated ?? 0}/${row.words?.total ?? 0}`],
          ['Translated phrases', (row) => `${row.phrases?.translated ?? 0}/${row.phrases?.total ?? 0}`],
        );
      }
    }

    if (showsProofread(show)) {
      sections.push(['Proofread', (row) => `${row.approval}`]);

      if (verbose) {
        sections.push(
          ['Proofread words', (row) => `${row.words?.approved ?? 0}/${row.words?.total ?? 0}`],
          ['Proofread phrases', (row) => `${row.phrases?.approved ?? 0}/${row.phrases?.total ?? 0}`],
        );
      }
    }

    // A lone section needs no header — Java prints the bare lines for `status translation`, and with
    // one metric on screen there is nothing to tell apart.
    const headed = sections.length > 1;

    return sections
      .flatMap(([title, value]) => [
        ...(headed ? [`${title}:`] : []),
        ...rows.map((row) => `${row.languageId} ${value(row)}`),
      ])
      .join('\n');
  },
});

/**
 * The grid text renders: one row per language, keyed by Java's `French(fr)` header so the name and
 * the code stay together without a column of their own. `verbose` adds the word and phrase counts
 * the verbose lines carry; the columns follow `show` either way.
 */
export function statusTableView(
  rows: ProgressRow[],
  show: ProgressView,
  verbose = false,
): Record<string, Record<string, string>> {
  const table: Record<string, Record<string, string>> = {};

  for (const row of rows) {
    const cells: Record<string, string> = {};

    if (showsTranslated(show)) {
      cells.Translated = `${row.translation}%`;

      if (verbose) {
        cells['Translated words'] = `${row.words?.translated ?? 0}/${row.words?.total ?? 0}`;
        cells['Translated phrases'] = `${row.phrases?.translated ?? 0}/${row.phrases?.total ?? 0}`;
      }
    }

    if (showsProofread(show)) {
      cells.Proofread = `${row.approval}%`;

      if (verbose) {
        cells['Proofread words'] = `${row.words?.approved ?? 0}/${row.words?.total ?? 0}`;
        cells['Proofread phrases'] = `${row.phrases?.approved ?? 0}/${row.phrases?.total ?? 0}`;
      }
    }

    table[`${row.name}(${row.languageId})`] = cells;
  }

  return table;
}

export function toProgressList(rows: ProgressRow[], show: ProgressView, verbose = false): ProgressEntry[] {
  const translated = showsTranslated(show);
  const proofread = showsProofread(show);

  return rows.map((row) => ({
    language: row.languageId,
    ...(translated && { translation: row.translation }),
    ...(proofread && { approval: row.approval }),
    ...(verbose && {
      ...(translated && { translatedWords: row.words?.translated ?? 0 }),
      ...(proofread && { approvedWords: row.words?.approved ?? 0 }),
      totalWords: row.words?.total ?? 0,
      ...(translated && { translatedPhrases: row.phrases?.translated ?? 0 }),
      ...(proofread && { approvedPhrases: row.phrases?.approved ?? 0 }),
      totalPhrases: row.phrases?.total ?? 0,
    }),
  }));
}
