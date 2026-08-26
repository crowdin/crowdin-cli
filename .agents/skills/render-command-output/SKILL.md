---
name: render-command-output
description: Use when adding or changing what a CLI command prints - creating or editing views (views.ts), list/item/grid/table rendering, deciding what --output plain, json, or toon emit, --verbose behavior, empty states, warnings and errors, stdout vs stderr, or reviewing output-related changes.
---

# Command output philosophy

## The model

One global flag, four formats: `--output` = `text` (default) | `json` | `toon` | `plain`, implemented in `cli/utils/output.ts` + `cli/utils/formatter.ts`. Two axes classify them:

- **Machine vs prose**: json, toon, *and* plain are parseable contracts - the command owes the caller a result document, not narrative.
- **Structured vs line-oriented**: json/toon serialize a value wholesale; text and plain emit lines.

**Core principle: stdout carries only the result document; diagnostics go to stderr in every format.**

## What each format is for, and how it should look

**text - a human at a terminal.** The only format with ceremony: colors, success/info symbols, spinners, intro/outro, empty-state notices, friendly sentences. Everything decorative lives here and only here. Views color their own lines (`colors.yellow('#id')`, green names) - colors auto-disable outside text, so views never guard them.

**plain - a shell pipeline.** Machine-oriented but line-oriented: the zero-dependency format for `grep`/`xargs`/`awk`. One bare line per entity: identifier first, then space-safe fields - a field that can contain spaces goes last or stays out, so the line splits predictably on whitespace. No symbols, no color, no prose: `File #12: path` is a text line, not a plain line; self-description for machines lives in json/toon. The line **is** the contract - its wording is frozen once shipped, and zero lines is itself a valid answer (an empty list prints nothing). A view defines `plain` when the pipeline line differs from the human line; when the text line already is the bare contract, plain falls back to it.

**json - a parser.** The complete structured result: values in raw shape (the view does no display shaping here), narrowed by the view's `keys` to the fields the rendered line shows, pretty-printed on stdout. Missing keys become `null` rather than vanishing, so lists stay uniform. Diagnostics are one compact record per line on stderr (`{"level","message"[,"code"]}`), emitted as they happen so a killed run keeps what it already reported.

**toon - an AI agent.** The same data contract as json in TOON's token-efficient tabular encoding. Never diverges from json in *what* is carried, only in how it's encoded (stderr records are blank-line separated).

## --verbose adds more information

`--verbose` doesn't depend on the output format - it means "show more information", and each format renders that the way it renders everything else. Mechanically, a verbose view extends the base view (the text line and `keys`); shipped plain lines keep their contract.

## Rendering surface - Output methods per format

| Method | text | plain | json / toon |
|---|---|---|---|
| `list(items, view, {empty})` | `◆  view.text` per item; info line with `empty` when zero items | `view.plain` (fallback: `view.text`) per item; **nothing** when empty | items narrowed to `view.keys`; `[]` when empty |
| `item(value, view, {mark})` | `view.text`, `◆` prefix unless `mark: false` | `view.plain` ?? `view.text`, bare | value narrowed to `view.keys` |
| `grid` / `table` | rendered grid | **nothing - hand-roll a plain view** (see Report shapes) | serialized rows |
| `warning` / `error` | icon line → stderr | bare line → stderr | one record per line → stderr |
| `success` / `info` / `log`, `intro`/`outro`, spinner progress | shown | silent | silent |

A spinner's `error` operation routes to `error()`, so spinner failures reach stderr in every format; only its progress messages are text-only.

## Report shapes - follow the precedent

| Shape | Plain form | Precedent |
|---|---|---|
| Entity report (`info`-style) | bare-id headline + the same detail lines as text | `commands/string/views.ts` `createStringView` |
| Stats report | `Key: value` per line; no title, no footer | `commands/context/views.ts` `contextStatusPlainView` |
| 2-D grid (languages × metrics) | hand-rolled plain view; a direct `options.output === 'plain'` branch is allowed here | `commands/status/StatusCommand.ts` |
| Dry-run path listing | machine format wins over `--tree`; use `printDryRunPaths` | `commands/common/dryRunPaths.ts` |

Multi-line reports render via `output.item(value, view, { mark: false })` - a report block, not a mutation echo.

## Contract rules

- **Plain wording is frozen.** Scripts parse these lines. Changing an existing plain line - or a `keys` name - is a breaking change. "Friendlier"/"more readable" belongs to text; plain optimizes for `awk '{print $1}'`, not for eyes.
- **Behavior differences between formats are contracts, not tools.** A few commands deliberately behave differently under plain (suppressed messages, an error where text warns); each is documented in a code comment where it occurs. Never invent new ones.
- **Direct format branching** (`options.output === 'plain'`, `isMachineFormat`, `isStructuredFormat`) in an action is allowed only for hand-rolled reports and the established behavior differences above. Everything else goes through one `View` and the `Output` helper.

## Common mistakes

| Mistake | Reality |
|---|---|
| Expecting the `empty` message in machine formats | It renders via `info()` → text only. json/toon print `[]`; plain prints nothing - zero lines is the answer |
| Emitting warnings via `log()`/`console.log`, or assuming they're dropped outside text | `output.warning()` → stderr in every format, structured record in json/toon |
| Decorating the plain line to make it self-describing | Plain is bare fields, identifier first; self-description lives in json/toon |
| Branching on `options.output` for a plain list | One `View` + `output.list` covers all four formats |
| Checking `=== 'plain'` where json/toon also owe the result | Use `isMachineFormat`/`isStructuredFormat` from `formatter.ts` |
| Rewording an existing plain line during a refactor | Frozen contract - treat as a breaking change, don't |
