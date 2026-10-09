import { describe, expect, test } from 'bun:test';
import {
  type AutoTranslationJob,
  autoTranslationVerboseView,
  autoTranslationView,
  jobStatusVerboseView,
  jobStatusView,
  jobVerboseView,
  jobView,
} from '@/cli/commands/auto-translate/views.ts';

describe('auto-translate views', () => {
  const createJob = (overrides: Partial<AutoTranslationJob> = {}): AutoTranslationJob => ({
    identifier: '121',
    status: 'finished',
    progress: 100,
    method: 'tm',
    priority: 'normal',
    createdAt: '2026-10-08T00:00:00+00:00',
    finishedAt: '2026-10-08T00:01:00+00:00',
    languageIds: ['uk', 'it'],
    fileCount: 2,
    ...overrides,
  });

  test('renders the run result as the identifier alone', () => {
    const result = { identifier: '121', status: 'created' };

    expect(autoTranslationView.text(result)).toBe('121');
    expect(autoTranslationVerboseView.text(result)).toBe('121');
  });

  test('renders a job row', () => {
    expect(jobView.text(createJob())).toBe('121 finished 100% tm');
    expect(jobView.plain?.(createJob())).toBe('121 finished');
  });

  test('adds languages and the file count to a verbose job row', () => {
    expect(jobVerboseView.text(createJob())).toBe('121 finished 100% tm uk,it 2 file(s)');
  });

  test('prefers the branch count for a string-based job', () => {
    expect(jobVerboseView.text(createJob({ fileCount: undefined, branchCount: 1 }))).toBe(
      '121 finished 100% tm uk,it 1 branch(es)',
    );
  });

  test('renders zero files when the job has no file ids', () => {
    expect(jobVerboseView.text(createJob({ fileCount: undefined }))).toBe('121 finished 100% tm uk,it 0 file(s)');
  });

  test('renders the status with its progress', () => {
    expect(jobStatusView.text(createJob({ status: 'inProgress', progress: 40 }))).toBe('inProgress (40%)');
  });

  test('keeps the plain job line for status', () => {
    expect(jobStatusView.plain?.(createJob())).toBe('121 finished');
  });

  test('adds the report totals to a verbose status', () => {
    const job = createJob({ files: 1, phrases: 5, words: 12, skipped: 2 });

    expect(jobStatusVerboseView.text(job)).toBe(
      'finished (100%)\n\t- files: 1\n\t- phrases: 5\n\t- words: 12\n\t- skipped: 2',
    );
  });

  test('leaves the totals off a verbose status without a report', () => {
    expect(jobStatusVerboseView.text(createJob({ status: 'inProgress', progress: 40 }))).toBe('inProgress (40%)');
  });
});
