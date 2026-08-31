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
// Per-run project name: `e2e-<unix seconds>-<suite>` (see helpers/project.ts). The CLI echoes it
// wherever it names a project-derived entity - a project's own TM or glossary, for instance
// (`e2e-1788179144-glossary's Glossary.tbx`), which changes on every run.
const PROJECT_NAME = /e2e-\d{6,}-/g;
// Poll-driven progress lines (`Importing glossary (0%)` … `(100%)`) repeat once per poll, and BOTH
// how many appear and which percentages they caught depend on server timing - one run sees `(0%)`
// then `(100%)`, the next only `(100%)`. Masking the number first makes every poll line identical,
// so the collapse below reduces any number of them to one. Only *consecutive identical* lines
// collapse, so a genuinely repeated line for two different files still shows twice.
const PROGRESS_PERCENT = /\(\d{1,3}%\)/g;
const PROGRESS_LINE = /\(<pct>\)$/;

/** Group key shared by every line that starts with content rather than a status marker. */
const PLAIN = '';

/**
 * Group key for a line: its leading whitespace-delimited token, which is the
 * status marker (`◆`, `●`, …) for CLI status lines. Lines that share a marker
 * form one sortable block; an unmarked line groups with adjacent lines sharing
 * its first token, otherwise stands alone in emission order.
 */
function groupKey(line: string): string {
  if (/^\s/.test(line)) {
    // Leading whitespace (the `\t- source (n)` report lines): keyed by the whole line so each
    // stands alone here and sortReportBlocks can group them into parent/child blocks instead.
    return line;
  }

  // The token need not be followed by whitespace: a `--output plain` line is often a single bare
  // path with nothing after it, which is exactly the case that has to be grouped and sorted.
  const leading = line.match(/^(\S+)/)?.[1] ?? line;

  // A leading token carrying letters or digits is content, not a status marker - a bare path from
  // `--output plain`, or a sentence like 'Visit the … for more details'. A plain listing is emitted
  // in completion order, so giving each such line its own group left that order in the snapshot and
  // made it flip between runs; they share one sortable group instead.
  return /[\p{L}\p{N}]/u.test(leading) ? PLAIN : leading;
}

/**
 * Markers the CLI emits from concurrent per-file work, so their relative order is a race. Error and
 * spinner markers (`■`, `✖`, `◒`) are excluded because they are sequential - they are never sorted,
 * and their text stays intact. Note they do end up *after* the gathered status block when they were
 * originally interleaved with it, so a snapshot shows which errors occurred, not which success line
 * they fell between - that position was never stable enough to assert on anyway.
 */
const STATUS_MARKERS = new Set(['●', '▲', '◆']);

/** Collapse consecutive identical poll-progress lines to one. */
function collapseProgress(lines: string[]): string[] {
  return lines.filter((line, index) => !(PROGRESS_LINE.test(line) && index > 0 && lines[index - 1] === line));
}

/**
 * Report blocks (`\t- <source> (n)` followed by `\t\t- <path>` children, emitted by the
 * omitted-translations report) come out in Map-insertion order, which concurrency makes
 * nondeterministic. Sorting line by line would tear children away from their parent, so whole
 * blocks are sorted as units, children sorted inside each.
 */
function sortReportBlocks(lines: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < lines.length; ) {
    if (!(lines[i] as string).startsWith('\t') || (lines[i] as string).startsWith('\t\t')) {
      result.push(lines[i] as string);
      i++;
      continue;
    }

    const blocks: { head: string; children: string[] }[] = [];

    while (i < lines.length && (lines[i] as string).startsWith('\t')) {
      const line = lines[i] as string;

      if (line.startsWith('\t\t') && blocks.length > 0) {
        (blocks[blocks.length - 1] as { children: string[] }).children.push(line);
      } else {
        blocks.push({ head: line, children: [] });
      }

      i++;
    }

    blocks.sort((left, right) => (left.head < right.head ? -1 : left.head > right.head ? 1 : 0));
    result.push(...blocks.flatMap((block) => [block.head, ...block.children.sort()]));
  }

  return result;
}

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
    .replace(PROJECT_NAME, 'e2e-<run>-')
    .replace(PROGRESS_PERCENT, '(<pct>)')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const collapsed = collapseProgress(lines);

  const firstStatus = collapsed.findIndex((line) => STATUS_MARKERS.has(groupKey(line)));

  if (firstStatus === -1) {
    return sortReportBlocks(sortWithinRuns(collapsed)).join('\n');
  }

  // One block holding every status line, markers in order of first appearance, sorted within each.
  const byMarker = new Map<string, string[]>();

  for (const line of collapsed) {
    const key = groupKey(line);

    if (STATUS_MARKERS.has(key)) {
      byMarker.set(key, [...(byMarker.get(key) ?? []), line]);
    }
  }

  const statusBlock = [...byMarker.values()].flatMap((group) => group.sort());
  const before = collapsed.slice(0, firstStatus).filter((line) => !STATUS_MARKERS.has(groupKey(line)));
  const after = collapsed.slice(firstStatus).filter((line) => !STATUS_MARKERS.has(groupKey(line)));

  return [...sortReportBlocks(sortWithinRuns(before)), ...statusBlock, ...sortReportBlocks(sortWithinRuns(after))].join(
    '\n',
  );
}
