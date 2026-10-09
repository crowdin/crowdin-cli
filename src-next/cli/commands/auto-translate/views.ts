import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

/**
 * The outcome of one pre-translation run. Unlike upload and download this command writes no
 * files, so its result is the job itself plus, under `--verbose`, the totals from its report.
 *
 * Text prints those totals as indented lines, and nothing at all without `--verbose`, so this is
 * all json and toon get.
 */
export interface AutoTranslationResult {
  identifier: string;
  status: string;
  files?: number;
  phrases?: number;
  words?: number;
  skipped?: number;
}

/** One pre-translation job as `status` and `list` report it, flattened from the API status. */
export interface AutoTranslationJob {
  identifier: string;
  status: string;
  progress: number;
  method: string;
  priority: string;
  createdAt: string;
  finishedAt: string | null;
  languageIds: string[];
  fileCount?: number;
  branchCount?: number;
  files?: number;
  phrases?: number;
  words?: number;
  skipped?: number;
}

/**
 * Without `--verbose` the report is never fetched, so only the job itself can be reported.
 *
 * plain falls back to this line, so it carries the identifier alone even under `--verbose` —
 * the totals are a structured report and belong in json/toon.
 */
export const autoTranslationView: View<AutoTranslationResult> = {
  text: (result) => result.identifier,
  keys: ['identifier', 'status'],
};

/** `--verbose` costs one extra request for the report, and reaches json/toon as extra keys. */
export const autoTranslationVerboseView: View<AutoTranslationResult> = {
  ...autoTranslationView,
  keys: ['identifier', 'status', 'files', 'phrases', 'words', 'skipped'],
};

export const jobView: View<AutoTranslationJob> = {
  text: (job) => `${colors.yellow(job.identifier)} ${job.status} ${job.progress}% ${job.method}`,
  plain: (job) => `${job.identifier} ${job.status}`,
  keys: ['identifier', 'status', 'progress', 'method', 'priority', 'createdAt', 'finishedAt'],
};

export const jobVerboseView: View<AutoTranslationJob> = {
  ...jobView,
  text: (job) => {
    const scope = job.branchCount ? `${job.branchCount} branch(es)` : `${job.fileCount ?? 0} file(s)`;

    return `${jobView.text(job)} ${job.languageIds.join(',')} ${scope}`;
  },
  keys: [...(jobView.keys ?? []), 'languageIds', 'fileCount', 'branchCount'],
};

export const jobStatusView: View<AutoTranslationJob> = {
  ...jobView,
  text: (job) => `${job.status} (${job.progress}%)`,
  keys: ['identifier', 'status', 'progress', 'method', 'priority'],
};

/** The report exists only once the job finished, so the totals are left off before that. */
export const jobStatusVerboseView: View<AutoTranslationJob> = {
  ...jobStatusView,
  text: (job) =>
    job.files === undefined
      ? jobStatusView.text(job)
      : [
          jobStatusView.text(job),
          `\t- files: ${job.files}`,
          `\t- phrases: ${job.phrases}`,
          `\t- words: ${job.words}`,
          `\t- skipped: ${job.skipped}`,
        ].join('\n'),
  keys: [...(jobStatusView.keys ?? []), 'files', 'phrases', 'words', 'skipped'],
};
