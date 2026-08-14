import type { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

export interface ContextStats {
  total: number;
  withAi: number;
  withAiPercentage: string;
  withoutAi: number;
  withoutAiPercentage: string;
  withManual: number;
  withManualPercentage: string;
}

export type FileContextStats = ContextStats & { file: string };

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

/** The --by-file grid, keyed by path. console.table sizes the columns, so no padding here. */
export function contextStatusByFileTable(
  rows: FileContextStats[],
): Record<string, { Total: number; 'AI context': string; Missing: number }> {
  const table: Record<string, { Total: number; 'AI context': string; Missing: number }> = {};

  for (const row of rows) {
    table[row.file] = {
      Total: row.total,
      'AI context': `${row.withAi} (${row.withAiPercentage}%)`,
      Missing: row.total - row.withAi,
    };
  }

  return table;
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
 * The plain --by-file report: a section per metric, so every line stays "<file> <value>" and the
 * header above says which value it carries — nothing is positional beyond the path.
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
      .flatMap(([title, value]) => [`${title}:`, ...rows.map((row) => `${row.file} ${value(row)}`)])
      .join('\n');
  },
});
