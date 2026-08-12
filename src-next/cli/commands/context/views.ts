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

const FOOTER = "Run 'crowdin context download --status=empty' to export strings needing context.";

const title = (project: ProjectsGroupsModel.Project): string =>
  `Context Status for Project "${project.name}" (ID: ${project.id})`;

// Java ContextStatusAction: the coverage summary, one labelled line per bucket.
export const contextStatusView = (project: ProjectsGroupsModel.Project): View<ContextStats> => ({
  text: (stats) =>
    [
      title(project),
      '',
      `Total strings:       ${stats.total}`,
      `With AI context:     ${stats.withAi} (${stats.withAiPercentage}%)`,
      `Without AI context:  ${stats.withoutAi} (${stats.withoutAiPercentage}%)`,
      `With manual context: ${stats.withManual} (${stats.withManualPercentage}%)`,
      '',
      FOOTER,
    ].join('\n'),
});

// Java's byFile report: columns padded to the longest file path.
export const contextStatusByFileView = (project: ProjectsGroupsModel.Project): View<FileContextStats[]> => ({
  text: (rows) => {
    const fileWidth = Math.max(0, ...rows.map((row) => row.file.length));
    // The AI Context cell varies in width with the percentage ('0.00' vs '50.00'), so the column
    // is sized from the widest rendered cell — otherwise Missing shifts from row to row.
    const cells = rows.map((row) => `${String(row.withAi).padStart(6)} (${row.withAiPercentage}%)`);
    const aiWidth = Math.max(14, ...cells.map((cell) => cell.length));
    const lines = [
      title(project),
      '',
      `${'File'.padEnd(fileWidth)}   ${'Total'.padStart(8)}   ${'AI Context'.padStart(aiWidth)}   ${'Missing'.padStart(8)}`,
    ];

    rows.forEach((row, index) => {
      lines.push(
        `${row.file.padEnd(fileWidth)}   ${String(row.total).padStart(8)}   ${(cells[index] as string).padStart(aiWidth)}   ${String(row.total - row.withAi).padStart(8)}`,
      );
    });

    lines.push('', FOOTER);

    return lines.join('\n');
  },
});
