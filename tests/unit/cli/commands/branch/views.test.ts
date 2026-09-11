import { describe, expect, test } from 'bun:test';
import type { SourceFilesModel } from '@crowdin/crowdin-api-client';
import { branchView, type MergeSummaryRow, mergeView } from '@/cli/commands/branch/views.ts';

describe('branch views', () => {
  const createBranch = (overrides: Partial<SourceFilesModel.Branch> = {}): SourceFilesModel.Branch =>
    ({ id: 14, name: 'main', ...overrides }) as SourceFilesModel.Branch;

  test('renders id and name', () => {
    expect(branchView.text(createBranch())).toBe('#14 main');
  });

  test('prints the name alone in plain', () => {
    expect(branchView.plain?.(createBranch())).toBe('main');
  });

  test('strips leading slashes in both formats', () => {
    expect(branchView.text(createBranch({ name: '/main' }))).toBe('#14 main');
    expect(branchView.plain?.(createBranch({ name: '/main' }))).toBe('main');
  });

  describe('merge summary', () => {
    const summary: MergeSummaryRow = { targetBranchId: 15, added: 1, deleted: 2, updated: 3, conflicted: 0 };

    test('renders the merge message with the details indented underneath', () => {
      expect(mergeView('dev', 'main').text(summary)).toBe(
        "Merged branch 'dev' into 'main'\n\tMerge summary: added: 1, deleted: 2, updated: 3, conflicted: 0",
      );
    });

    test('keeps the target branch id out of the details line', () => {
      expect(mergeView('dev', 'main').text(summary)).not.toContain('targetBranchId');
    });

    // Java BranchMergeAction prints the target branch id alone in plain view.
    test('prints the target branch id alone in plain', () => {
      expect(mergeView('dev', 'main').plain?.(summary)).toBe('15');
    });
  });
});
