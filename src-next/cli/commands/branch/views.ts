import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';

// Shared by list and every mutation echo.
export const branchView: View<SourceFilesModel.Branch> = {
  text: (branch) => `${colors.yellow(`#${branch.id}`)} ${colors.green(stripLeadingSlashes(branch.name))}`,
  plain: (branch) => stripLeadingSlashes(branch.name),
  keys: ['id', 'name'],
};

export type MergeSummaryRow = { targetBranchId: number } & SourceFilesModel.MergeBranchSummary['details'];

// The merge line plus its summary on the next; plain prints the target branch id alone.
export const mergeView = (source: string, target: string): View<MergeSummaryRow> => ({
  text: ({ targetBranchId: _targetBranchId, ...details }) => {
    const summary = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return `${colors.green(`Merged branch '${source}' into '${target}'`)}\n\tMerge summary: ${summary}`;
  },
  plain: (row) => String(row.targetBranchId),
});
