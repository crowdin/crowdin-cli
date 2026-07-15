# Crowdin CLI

Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project.

This is the **v5 pre-release**, published under the `next` dist-tag. It ships a native, self-contained binary per platform - no Java, no Node runtime dependencies.

## Installation

```
npm i -g @crowdin/cli@next
```

npm automatically installs the binary matching your platform (macOS arm64/x64, Linux x64/arm64 glibc & musl, Windows x64).

## Highlights

Crowdin CLI 5.0 is a complete rewrite from Java to TypeScript, powered by [Bun](https://bun.sh). The command tree, `crowdin.yml` configuration, and exit codes stay the same - most workflows carry over unchanged.

- **Starts instantly** - no JVM warm-up. `crowdin --version` runs in ~1.6 ms versus ~223 ms in 4.x, a big win in CI where the CLI runs many times per pipeline.
- **No Java required** - a single self-contained binary per platform, nothing else to install or patch.
- **A friendlier interactive experience** - clean select menus, spinners, and graceful cancellation. `crowdin init` walks you from browser authorization to a ready `crowdin.yml` in under a minute.
- **Output built for scripts and AI agents** - the new global `-o, --output` option works on any command: `json` (machine-readable, pipe into `jq`), `toon` ([Token-Oriented Object Notation](https://github.com/toon-format/toon) - same data, ~60% smaller, ideal for LLM workflows), and `plain` (replaces the old `--plain` flag).
- **Cached uploads are stable** - `upload sources --cache` is no longer experimental; unchanged source files are skipped between runs.

## Breaking changes

- `pre-translate` is renamed to `auto-translate` (no alias).
- `--plain` is now `--output plain`.
- Redundant negatable flags removed (for example `--auto-update`, `--no-cleanup-mode`, `--no-auto-tag`) - defaults are unchanged, so simply drop them. `--preserve-hierarchy` was removed; set `preserve_hierarchy: true` in the config instead (`--no-preserve-hierarchy` still works).
- The `upload sources --cache` file (`.crowdin/cache.json`) is now resolved relative to `base_path` instead of the current working directory.
- `ignore_hidden_files` now also skips files inside dot-directories (for example `.github/config.json`).
- `config sources`: the no-op `--branch` option was removed.
- `distribution add`/`edit`: deprecated `--export-mode` and `--file` removed (use `--bundle-id`), and `--branch` dropped.

> **Note:** This is a **pre-release**. Expect rough edges and possible breaking changes between pre-releases. Additional distribution channels (Homebrew, Chocolatey, Docker, standalone binaries) will arrive as 5.0 approaches general availability.

## Shell completion

Crowdin CLI ships completions for `zsh`, `bash`, `fish`, and `powershell`. Add the matching line to your shell config so the script is sourced fresh on each shell start:

```bash
# zsh
echo 'source <(crowdin complete zsh)' >> ~/.zshrc

# bash
echo 'source <(crowdin complete bash)' >> ~/.bashrc

# fish
echo 'crowdin complete fish | source' >> ~/.config/fish/config.fish

# powershell
echo 'crowdin complete powershell | Out-String | Invoke-Expression' >> $PROFILE
```

Restart your shell (or `source` the config file) and press `<TAB>` after `crowdin` to complete commands, flags, and option values.

Prefer not to run the CLI on every shell start? Write the script to your shell's completions directory instead (no config edit, but re-run it after upgrades):

```bash
# zsh (a writable directory on your $fpath)
crowdin complete zsh > "${fpath[1]}/_crowdin"

# bash
crowdin complete bash > ~/.local/share/bash-completion/completions/crowdin

# fish
crowdin complete fish > ~/.config/fish/completions/crowdin.fish
```

## Documentation

- [Crowdin CLI documentation](https://crowdin.github.io/crowdin-cli)
- [Report an issue](https://github.com/crowdin/crowdin-cli/issues)

## License

MIT
