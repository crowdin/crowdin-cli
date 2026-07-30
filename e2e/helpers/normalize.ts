/**
 * Black-box output normalization. Every suite calls `normalize(output)` before
 * snapshotting - no per-suite configuration. The CLI emits colors, generated
 * ids, timings, and parallel per-file lines in nondeterministic order, none of
 * which are snapshot-stable, so `normalize`:
 *
 *   1. strips ANSI/invisible characters,
 *   2. masks generated ids (`#123` → `#id`) and durations (`1.2s` → `<dur>`),
 *   3. gathers the status lines (`●`/`▲`/`◆`) into one block, grouped by marker
 *      and sorted within each group,
 *   4. sorts remaining lines within each contiguous run of same-marker lines.
 *
 * Concurrency means status lines interleave differently on every run: a `◆ File
 * … created` for one file can land between two `● Importing …` lines, and which
 * one wins is a race. Sorting only *contiguous* runs (the original rule) made
 * that interleaving decide where the run boundaries fell, so the same output
 * normalized two different ways - the single largest source of flaky snapshots
 * in these suites. Collecting every status line regardless of position removes
 * the race from the result: the `●` block still precedes the `◆` block (marker
 * order follows first appearance), and both are internally sorted.
 *
 * Non-status lines keep the contiguous-run rule, which matters for table output
 * (`│ … │`): rows are sorted within their own table instead of being merged
 * across every table in the output.
 *
 * Because only siblings are sorted, snapshots don't guard the *ordering within*
 * a block - suites assert load-bearing facts (counts, messages, exit codes)
 * explicitly instead.
 */

// CSI/SGR escape sequences plus standalone ESC-prefixed control sequences.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching terminal control codes is the point.
const ANSI = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
// Zero-width space/non-joiner/joiner (U+200B–U+200D) and BOM (U+FEFF).
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;
// `#123`-style identifiers (string/file ids) without touching bare counts.
const IDS = /#\d+/g;
// Timing/speed values like `1.23s` or `450ms`.
const DURATIONS = /\d+(?:\.\d+)?\s?m?s\b/g;
// Per-run temp workspace root: `<os-tmp>/crowdin-e2e/<pid>-<seed>` (see workspace.ts).
// The prefix and `<pid>-<seed>` change every run, so any absolute path the CLI echoes
// back is non-deterministic; collapse the volatile root to a stable `<workspace>` token,
// leaving the suite-relative tail (e.g. `/init/crowdin.yaml`) intact.
const WORKSPACE = /[^\s'"]*\/crowdin-e2e\/\d+-\d+/g;

/**
 * Group key for a line: its leading whitespace-delimited token, which is the
 * status marker (`◆`, `●`, …) for CLI status lines. Lines that share a marker
 * form one sortable block; an unmarked line groups with adjacent lines sharing
 * its first token, otherwise stands alone in emission order.
 */
function groupKey(line: string): string {
  return line.match(/^(\S+)\s/)?.[1] ?? line;
}

/**
 * Markers the CLI emits from concurrent per-file work, so their relative order is a race. Error and
 * spinner markers (`■`, `✖`, `◒`) are excluded because they are sequential - they are never sorted,
 * and their text stays intact. Note they do end up *after* the gathered status block when they were
 * originally interleaved with it, so a snapshot shows which errors occurred, not which success line
 * they fell between - that position was never stable enough to assert on anyway.
 */
const STATUS_MARKERS = new Set(['●', '▲', '◆']);

/** Sort each contiguous run of same-marker lines, leaving run order untouched. */
function sortWithinRuns(lines: string[]): string[] {
  const result: string[] = [];

  for (let start = 0; start < lines.length; ) {
    const key = groupKey(lines[start] as string);
    let end = start + 1;

    while (end < lines.length && groupKey(lines[end] as string) === key) {
      end++;
    }

    result.push(...lines.slice(start, end).sort());
    start = end;
  }

  return result;
}

export function normalize(output: string): string {
  const lines = output
    .replace(ANSI, '')
    .replace(INVISIBLE, '')
    .replace(IDS, '#id')
    .replace(DURATIONS, '<dur>')
    .replace(WORKSPACE, '<workspace>')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const firstStatus = lines.findIndex((line) => STATUS_MARKERS.has(groupKey(line)));

  if (firstStatus === -1) {
    return sortWithinRuns(lines).join('\n');
  }

  // One block holding every status line, markers in order of first appearance, sorted within each.
  const byMarker = new Map<string, string[]>();

  for (const line of lines) {
    const key = groupKey(line);

    if (STATUS_MARKERS.has(key)) {
      byMarker.set(key, [...(byMarker.get(key) ?? []), line]);
    }
  }

  const statusBlock = [...byMarker.values()].flatMap((group) => group.sort());
  const before = lines.slice(0, firstStatus).filter((line) => !STATUS_MARKERS.has(groupKey(line)));
  const after = lines.slice(firstStatus).filter((line) => !STATUS_MARKERS.has(groupKey(line)));

  return [...sortWithinRuns(before), ...statusBlock, ...sortWithinRuns(after)].join('\n');
}
