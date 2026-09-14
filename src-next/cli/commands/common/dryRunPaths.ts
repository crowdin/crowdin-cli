import { pathView } from '@/cli/commands/common/views.ts';
import { printFileTree } from '@/cli/utils/fileTree.ts';
import { isMachineFormat } from '@/cli/utils/formatter.ts';
import type { Output } from '@/cli/utils/output.ts';

export interface DryRunListingOptions {
  output?: string;
  tree?: boolean;
}

/**
 * Emits a dry-run path listing in whichever form the flags call for, and reports whether it did.
 *
 * A machine `--output` (json/toon/plain) is a parseable contract, so it wins over `--tree` and
 * goes through `output.list`: a path per line in plain, the array in json/toon. `printFileTree`
 * goes through `output.log`, which is text-only.
 *
 * Returns false when neither applies, so a caller that has its own non-listing dry-run output
 * (the per-file "would be created" messages) can carry on.
 *
 * `paths` arrive prepared — slash-stripped and sorted via toSortedRelativePaths — because callers
 * that also print the listing themselves in text need them in that shape anyway.
 */
export function printDryRunPaths(paths: string[], options: DryRunListingOptions, output: Output): boolean {
  if (isMachineFormat(options.output)) {
    output.list(paths, pathView);
    return true;
  }

  if (options.tree) {
    printFileTree(paths, output);
    return true;
  }

  return false;
}
