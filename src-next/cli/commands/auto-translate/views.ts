import type { View } from '@/cli/utils/output.ts';

/**
 * The outcome of one pre-translation run. Unlike upload and download this command writes no
 * files, so its result is the job itself plus, under `--verbose`, the totals from its report.
 *
 * Text prints those totals as indented lines, and nothing at all without `--verbose`, so this is
 * all json and toon get.
 */
export interface AutoTranslateResult {
  identifier: string;
  status: string;
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
export const autoTranslateView: View<AutoTranslateResult> = {
  text: (result) => result.identifier,
  keys: ['identifier', 'status'],
};

/** `--verbose` costs one extra request for the report, and reaches json/toon as extra keys. */
export const autoTranslateVerboseView: View<AutoTranslateResult> = {
  ...autoTranslateView,
  keys: ['identifier', 'status', 'files', 'phrases', 'words', 'skipped'],
};
