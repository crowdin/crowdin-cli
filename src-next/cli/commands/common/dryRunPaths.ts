import { pathView } from '@/cli/commands/common/views.ts';
import { printFileTree } from '@/cli/utils/fileTree.ts';
import { OUTPUT_FORMATS, type Output } from '@/cli/utils/output.ts';
import { toSortedRelativePaths } from '@/lib/utils/path.ts';

export interface DryRunListingOptions {
  output?: string;
  tree?: boolean;
}

/**
 * Emits a dry-run path listing in whichever form the flags call for, and reports whether it did.
 *
 * A machine `--output` (json/toon/plain) is a parseable contract, so it wins over `--tree` and
 * goes through `output.list`: a path per line in plain, the array in json/toon. `printFileTree`
 * and bare lines both go through `output.log`, which is text-only — checking for `plain` alone,
 * as three of these call sites used to, left `--output=json` and `--output=toon` printing nothing.
 *
 * Returns false when neither applies, so a caller that has its own non-listing dry-run output
 * (the per-file "would be created" messages) can carry on.
 */
export function printDryRunPaths(paths: string[], options: DryRunListingOptions, output: Output): boolean {
  // The format check stays: in text the caller prints its own messages instead, and it needs to
  // know the listing wasn't emitted.
  if (OUTPUT_FORMATS.includes(options.output ?? '')) {
    output.list(toSortedRelativePaths(paths), pathView);
    return true;
  }

  if (options.tree) {
    printFileTree(paths, output);
    return true;
  }

  return false;
}
