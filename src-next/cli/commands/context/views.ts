import type { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { TableGrid, View } from '@/cli/utils/output.ts';

export interface ContextStats {
  total: number;
  withAi: number;
  withAiPercentage: string;
  withoutAi: number;
  withoutAiPercentage: string;
  withManual: number;
  withManualPercentage: string;
}

export type FileContextStats = ContextStats & { file: string; branch?: string };

/** A named block of "<file> <value>" lines, the by-file counterpart of the summary's keyed lines. */
type PlainSection = [title: string, value: (row: FileContextStats) => string];

export const contextStatusTitle = (project: ProjectsGroupsModel.Project): string =>
  `Context Status for Project "${project.name}" (ID: ${project.id})`;

export const contextStatusFooter = "Run 'crowdin context download --status=empty' to export strings needing context.";

/** The summary grid text renders: one row per metric, counts and percentages in their own columns. */
export function contextStatusTable(stats: ContextStats): Record<string, { Count: number; Percent: string }> {
  return {
    'Total strings': { Count: stats.total, Percent: '' },
    'With AI context': { Count: stats.withAi, Percent: `${stats.withAiPercentage}%` },
    'Without AI context': { Count: stats.withoutAi, Percent: `${stats.withoutAiPercentage}%` },
    'With manual context': { Count: stats.withManual, Percent: `${stats.withManualPercentage}%` },
  };
}

/**
 * The --by-file grid. Rows rather than a keyed object, because two branches hold the same path and
 * a keyed grid would collapse them into one row; the branch gets a column of its own, dropped
 * entirely when nothing in the listing sits in a branch.
 */
export function contextStatusByFileTable(rows: FileContextStats[]): TableGrid {
  const hasBranch = rows.some((row) => row.branch);

  return {
    columns: [
      { name: 'file', title: 'File', alignment: 'left' },
      ...(hasBranch ? [{ name: 'branch', title: 'Branch', alignment: 'left' as const }] : []),
      { name: 'total', title: 'Total', alignment: 'right' },
      { name: 'aiContext', title: 'AI context', alignment: 'right' },
      { name: 'missing', title: 'Missing', alignment: 'right' },
    ],
    // A key the columns don't declare still becomes a column, so the branch only goes into the rows
    // when there is a branch column to hold it.
    rows: rows.map((row) => ({
      file: row.file,
      ...(hasBranch ? { branch: row.branch ?? '' } : {}),
      total: row.total,
      aiContext: `${row.withAi} (${row.withAiPercentage}%)`,
      missing: row.total - row.withAi,
    })),
  };
}

/**
 * The plain report: one "<key> <value>" line per metric, counts and percentages on lines of their
 * own. No title, no footer — the project is what the caller passed in, and the "run this next"
 * advice is for a human at a terminal, which text output already serves.
 *
 * Only plain reaches these views: text draws the grids above, json/toon serialize the stats.
 */
export const contextStatusPlainView = (): View<ContextStats> => ({
  text: (stats) =>
    [
      `Total strings: ${stats.total}`,
      `With AI context: ${stats.withAi}`,
      `With AI context (percentage): ${stats.withAiPercentage}`,
      `Without AI context: ${stats.withoutAi}`,
      `Without AI context (percentage): ${stats.withoutAiPercentage}`,
      `With manual context: ${stats.withManual}`,
      `With manual context (percentage): ${stats.withManualPercentage}`,
    ].join('\n'),
});

/**
 * The plain --by-file report: a section per metric, so every line stays "<file> <branch> <value>"
 * and the header above says which value it carries. The branch is a field of its own rather than a
 * prefix on the path, so each line is self-contained — a consumer never has to pair rows across
 * sections or split a branch off a path. A file outside every branch carries '-', keeping the
 * column count the same for every row.
 */
export const contextStatusByFilePlainView = (): View<FileContextStats[]> => ({
  text: (rows) => {
    const sections: PlainSection[] = [
      ['Total strings', (row) => `${row.total}`],
      ['With AI context', (row) => `${row.withAi}`],
      ['With AI context (percentage)', (row) => row.withAiPercentage],
      ['Missing', (row) => `${row.total - row.withAi}`],
    ];

    return sections
      .flatMap(([title, value]) => [
        `${title}:`,
        ...rows.map((row) => `${row.file} ${row.branch || '-'} ${value(row)}`),
      ])
      .join('\n');
  },
});
