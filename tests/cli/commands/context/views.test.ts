import { describe, expect, test } from 'bun:test';
import {
  type ContextStats,
  contextStatusByFilePlainView,
  contextStatusPlainView,
  type FileContextStats,
} from '@/cli/commands/context/views.ts';

describe('context views', () => {
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
    // No title, no footer: plain carries the numbers, text carries the report around them.
    test('renders one keyed line per metric', () => {
      expect(contextStatusPlainView().text(stats())).toBe(
        [
          'Total strings: 3',
          'With AI context: 1',
          'With AI context (percentage): 33.33',
          'Without AI context: 2',
          'Without AI context (percentage): 66.67',
          'With manual context: 2',
          'With manual context (percentage): 66.67',
        ].join('\n'),
      );
    });

    // The label carries the spaces, so the colon is what a consumer splits on.
    test('keeps every line at one label and one value', () => {
      for (const line of contextStatusPlainView().text(stats()).split('\n')) {
        expect(line).toMatch(/^[^:]+: \S+$/);
      }
    });
  });

  describe('by file', () => {
    const rows: FileContextStats[] = [
      { file: '/first.txt', ...stats({ total: 2, withAi: 1, withAiPercentage: '50.00' }) },
      { file: '/second.txt', ...stats({ total: 1, withAi: 0, withAiPercentage: '0.00' }) },
    ];

    test('heads a section per metric, one line per file', () => {
      expect(contextStatusByFilePlainView().text(rows)).toBe(
        [
          'Total strings:',
          '/first.txt 2',
          '/second.txt 1',
          'With AI context:',
          '/first.txt 1',
          '/second.txt 0',
          'With AI context (percentage):',
          '/first.txt 50.00',
          '/second.txt 0.00',
          'Missing:',
          '/first.txt 1',
          '/second.txt 1',
        ].join('\n'),
      );
    });

    test('survives an empty row set', () => {
      expect(contextStatusByFilePlainView().text([])).toBe(
        ['Total strings:', 'With AI context:', 'With AI context (percentage):', 'Missing:'].join('\n'),
      );
    });
  });
});
