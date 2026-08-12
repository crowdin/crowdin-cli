import { describe, expect, test } from 'bun:test';
import type { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import {
  type ContextStats,
  contextStatusByFileView,
  contextStatusView,
  type FileContextStats,
} from '@/cli/commands/context/views.ts';

describe('context views', () => {
  const project = { id: 123, name: 'Test Project' } as ProjectsGroupsModel.Project;

  const stats = (overrides: Partial<ContextStats> = {}): ContextStats => ({
    total: 3,
    withAi: 1,
    withAiPercentage: '33.33',
    withoutAi: 2,
    withoutAiPercentage: '66.67',
    withManual: 2,
    withManualPercentage: '66.67',
    ...overrides,
  });

  describe('summary', () => {
    test('renders the title, the buckets and the footer', () => {
      expect(contextStatusView(project).text(stats())).toBe(
        [
          'Context Status for Project "Test Project" (ID: 123)',
          '',
          'Total strings:       3',
          'With AI context:     1 (33.33%)',
          'Without AI context:  2 (66.67%)',
          'With manual context: 2 (66.67%)',
          '',
          "Run 'crowdin context download --status=empty' to export strings needing context.",
        ].join('\n'),
      );
    });
  });

  describe('by file', () => {
    const rows: FileContextStats[] = [
      { file: '/first.txt', ...stats({ total: 2, withAi: 1, withAiPercentage: '50.00' }) },
      { file: '/second.txt', ...stats({ total: 1, withAi: 0, withAiPercentage: '0.00' }) },
    ];

    test('pads the file column to the longest path', () => {
      const lines = contextStatusByFileView(project).text(rows).split('\n');
      const [header, first, second] = [lines[2], lines[3], lines[4]] as [string, string, string];

      expect(header).toBe('File             Total        AI Context    Missing');
      // '/second.txt' is the longest path, so the shorter one is padded out to it.
      expect(first.indexOf('2')).toBe(second.indexOf('1'));
    });

    // A shorter percentage ('0.00' vs '50.00') used to shift every column after it.
    test('keeps Missing aligned when the AI Context cells differ in width', () => {
      const lines = contextStatusByFileView(project).text(rows).split('\n');
      const [header, first, second] = [lines[2], lines[3], lines[4]] as [string, string, string];

      expect(first.lastIndexOf('1')).toBe(second.lastIndexOf('1'));
      expect(header.lastIndexOf('Missing') + 'Missing'.length).toBe(first.length);
    });

    test('renders a row per file with the missing count', () => {
      const text = contextStatusByFileView(project).text(rows);

      expect(text).toContain('/first.txt           2        1 (50.00%)          1');
      expect(text).toContain('/second.txt          1         0 (0.00%)          1');
    });

    test('keeps the title and footer around the table', () => {
      const lines = contextStatusByFileView(project).text(rows).split('\n');

      expect(lines[0]).toBe('Context Status for Project "Test Project" (ID: 123)');
      expect(lines.at(-1)).toBe("Run 'crowdin context download --status=empty' to export strings needing context.");
    });

    test('survives an empty row set', () => {
      const lines = contextStatusByFileView(project).text([]).split('\n');

      expect(lines[2]).toBe('File      Total       AI Context    Missing');
    });
  });
});
