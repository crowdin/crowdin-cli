---
title: Crowdin CLI 5.0
description: Crowdin CLI 5.0 is a complete rewrite in TypeScript powered by Bun - instant startup, no Java required, machine-readable output for scripts and AI agents, and more.
authors: [andrii-bodnar]
# TODO: add social card image and uncomment
# image: ./img/social-card.png
tags: [release]
---

Today we are happy to announce Crowdin CLI **5.0**! 🚀

This is the biggest change in the tool's history: the CLI has been rewritten from the ground up - from Java to TypeScript, powered by [Bun](https://bun.sh). The result is a dramatically faster, lighter tool built on a modern, industry-standard toolchain - one that lets us move faster and opens the door to capabilities that weren't practical before.

The good news for existing users: the command tree, the `crowdin.yml` configuration file, and the exit codes stay the same. Most workflows carry over unchanged, and the few breaking changes are listed below to make your migration easy.

<!--truncate-->

## Highlights

### Starts instantly

No JVM, no warm-up. The new CLI starts in about a millisecond:

|                     | CLI 4.x | CLI 5.0    |
|---------------------|---------|------------|
| `crowdin --version` | 223 ms  | **1.6 ms** |
| `crowdin --help`    | 248 ms  | **1.4 ms** |

<small>Measured with the standalone CLI 5.0 binary on an Apple Silicon MacBook, median of 10 runs. Your numbers will vary, but the ratio won't: startup is roughly two orders of magnitude faster.</small>

You might not notice 200 ms once. You will notice it in CI, where the CLI is often invoked dozens of times per pipeline.

### No Java required

Crowdin CLI 4.x was a Java application: a 7 MB jar that needed a few hundred megabytes of JRE installed and kept up to date. Crowdin CLI 5.0 ships as a single self-contained binary for macOS, Linux, and Windows - download it and run it. Nothing else to install, patch, or configure.

### A friendlier interactive experience

The interactive parts of the CLI got a complete facelift: clean select menus, spinners, and graceful cancellation everywhere. `crowdin init` walks you from browser authorization through project selection to a ready `crowdin.yml` in under a minute.

### Output built for scripts and AI agents

The new global <kbd>-o, --output</kbd> option changes the output format of any command. Two of the three formats are entirely new:

- `json` - finally, machine-readable output. Pipe `crowdin file list -o json` into `jq` or consume it from any script. Previously, the CLI could only produce human-oriented text.
- `toon` - [Token-Oriented Object Notation](https://github.com/toon-format/toon): the same data as JSON in a fraction of the size. Perfect when the consumer of your CLI output is an AI agent or an LLM workflow, where every token counts.
- `plain` - minimal, processable text output (replaces the old <kbd>--plain</kbd> flag).

Here is the same command in `json` and `toon`:

```json
$ crowdin file list --output json

[
  {
    "id": 14,
    "path": "src/main/res/values/strings.xml",
    "type": "android",
    "parserVersion": 3,
    "revisionId": 2
  },
  {
    "id": 16,
    "path": "src/locales/en.json",
    "type": "json",
    "parserVersion": 1,
    "revisionId": 5
  }
]
```

```
$ crowdin file list --output toon

[2]{id,path,type,parserVersion,revisionId}:
  14,src/main/res/values/strings.xml,android,3,2
  16,src/locales/en.json,json,1,5
```

:::tip
The TOON version is about **60% smaller** in characters and even cheaper in LLM tokens.
:::

### Cached uploads are now stable

The `upload sources` <kbd>--cache</kbd> option is no longer experimental - it has proven reliable and convenient. With <kbd>--cache</kbd>, the CLI remembers checksums of your source files and skips files that haven't changed since the last run, making repeated uploads much faster in large projects.

Read more about it [here](/commands/crowdin-upload-sources).

### Smarter update notifications

The CLI used to check for a new version on every run. Now the check happens at most once a day, compares versions properly, and never slows down or fails your command - network hiccups are silently ignored.

## Installation

<!-- TODO: confirm the final installation channels before publishing -->

```bash
npm install -g @crowdin/cli
```

The npm package ships with everything it needs - there is no runtime to install first. Not using npm? Grab the standalone binary for your platform from the [GitHub release](https://github.com/crowdin/crowdin-cli/releases) instead.

See the [Installation](/installation) page for the full list of methods.

## Breaking changes

### `pre-translate` is now `auto-translate`

The command has been renamed. There is no alias, so update your scripts:

```diff
-crowdin pre-translate --method tm
+crowdin auto-translate --method tm
```

### `--plain` is now `--output plain`

The standalone <kbd>--plain</kbd> flag is gone; use the global <kbd>--output</kbd> option instead. The <kbd>--tree</kbd> flag is unchanged.

```diff
-crowdin status --plain
+crowdin status --output plain
```

### Negatable options collapsed to single flags

In CLI 4.x, many boolean options were negatable - they accepted both a positive and a `--no-` form (for example, both <kbd>--auto-tag</kbd> and <kbd>--no-auto-tag</kbd>). In 5.0, each of these options keeps only the form that changes the default behavior. The defaults themselves are unchanged, so the removed form was always redundant - if your scripts use it, simply drop it:

| Command                         | Removed form                                                                                                                     | Migration                                                                                                       |
|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `upload sources`, `file upload` | <kbd>--auto-update</kbd>                                                                                                           | Drop it - source files are updated by default. Use <kbd>--no-auto-update</kbd> to disable updating.                |
| `file upload`                   | <kbd>--no-cleanup-mode</kbd>, <kbd>--no-update-strings</kbd>                                                                       | Drop them - disabled is the default.                                                                                |
| `upload translations`           | <kbd>--no-auto-approve-imported</kbd>, <kbd>--no-import-eq-suggestions</kbd>, <kbd>--no-translate-hidden</kbd>                     | Drop them - disabled is the default.                                                                                |
| `auto-translate`                | <kbd>--no-duplicate-translations</kbd>, <kbd>--no-translate-untranslated-only</kbd>, <kbd>--no-translate-with-perfect-match-only</kbd> | Drop them - disabled is the default.                                                                            |
| `task add`                      | <kbd>--no-skip-assigned-strings</kbd>, <kbd>--no-include-pre-translated-strings-only</kbd>                                         | Drop them - disabled is the default.                                                                                |
| `screenshot upload`             | <kbd>--no-auto-tag</kbd>                                                                                                           | Drop it - disabled is the default.                                                                                  |
| file-based commands, `init`     | <kbd>--preserve-hierarchy</kbd>                                                                                                    | Drop it. If you used it to override `preserve_hierarchy: false` from the configuration file, set `preserve_hierarchy: true` there instead. <kbd>--no-preserve-hierarchy</kbd> still works. |

```diff
-crowdin upload sources --auto-update --preserve-hierarchy
+crowdin upload sources

-crowdin upload translations --no-translate-hidden
+crowdin upload translations
```

The `string edit` command is not affected: both <kbd>--hidden</kbd> and <kbd>--no-hidden</kbd> are still available there, as they trigger different actions.

### Source cache location

The cache used by `upload sources --cache` (`.crowdin/cache.json`) is now resolved relative to your configured `base_path` instead of the current working directory. The cache lives next to the files it describes and no longer pollutes unrelated directories. The first upload after upgrading may rebuild the cache.

### `ignore_hidden_files` now ignores dot-directories

Previously, only files whose own name starts with a dot were ignored - files inside a hidden directory (for example, `.github/config.json`) were still uploaded. Now entire dot-directories are skipped. If you rely on uploading files from hidden directories, set `ignore_hidden_files: false` in your configuration.

### `config sources`

The <kbd>--branch</kbd> option was removed from the `crowdin config sources` command - it had no effect.

### `distribution add` and `distribution edit`

The deprecated <kbd>--export-mode</kbd> and <kbd>--file</kbd> options were removed - use <kbd>--bundle-id</kbd> instead. The <kbd>--branch</kbd> option was dropped as well.

```diff
-crowdin distribution add "My Distribution" --export-mode bundle --file strings.xml
+crowdin distribution add "My Distribution" --bundle-id 12
```

## Summary

Crowdin CLI 5.0 is the same tool you know, rebuilt on a modern foundation: it starts instantly, runs anywhere without Java, and speaks JSON and TOON for your scripts and AI agents - all while keeping the command tree, `crowdin.yml`, and exit codes you rely on. Skim the breaking changes above, adjust your scripts where needed, and enjoy the fastest Crowdin CLI yet.

:::tip
Need help or have questions? [Let's discuss it](https://github.com/crowdin/crowdin-cli/discussions)!
:::
