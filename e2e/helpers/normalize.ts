/**
 * Black-box output normalization. Every suite calls `normalize(output)` before
 * snapshotting - no per-suite configuration. The CLI emits colors, generated
 * ids, timings, and parallel per-file lines in nondeterministic order, none of
 * which are snapshot-stable, so `normalize`:
 *
 *   1. strips ANSI/invisible characters,
 *   2. masks generated ids (`#123` → `#id`) and durations (`1.2s` → `<dur>`),
 *   3. sorts lines *within* each contiguous run of same-marker lines.
 *
 * Only the parallel result lines (`◆ File … created`, emitted by concurrent
 * uploads) are actually unordered; the leading progress lines (`● Fetching …`)
 * are sequential. Sorting the whole output would interleave those blocks and
 * misrepresent the real flow, so instead we group by leading marker and sort
 * each block in place - the progress block stays above the results block, and
 * siblings within a block become order-independent.
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

/**
 * Group key for a line: its leading whitespace-delimited token, which is the
 * status marker (`◆`, `●`, …) for CLI status lines. Lines that share a marker
 * form one sortable block; an unmarked line groups with adjacent lines sharing
 * its first token, otherwise stands alone in emission order.
 */
function groupKey(line: string): string {
  return line.match(/^(\S+)\s/)?.[1] ?? line;
}

export function normalize(output: string): string {
  const lines = output
    .replace(ANSI, '')
    .replace(INVISIBLE, '')
    .replace(IDS, '#id')
    .replace(DURATIONS, '<dur>')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

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

  return result.join('\n');
}
