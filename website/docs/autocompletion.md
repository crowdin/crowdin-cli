---
description: Enable autocompletion so that the Crowdin CLI automatically completes your commands.
---

# Autocompletion

Crowdin CLI can generate shell completion scripts that suggest commands, subcommands, options, and option values as you type. This can significantly improve productivity by reducing the need to manually type or look up commands and options.

Completions are available for `zsh`, `bash`, `fish`, and `powershell`. The `crowdin complete <shell>` command prints the completion script for the given shell.

## Quick setup

Add the matching line to your shell config so the script is sourced fresh on each shell start:

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

Restart your shell (or `source` the config file), then start typing a Crowdin CLI command and hit the <kbd>Tab</kbd> key to get a list of possible completions based on your input.

## Installing to a completions directory

If you'd rather not run the CLI on every shell start, write the script to your shell's completions directory instead. This adds nothing to your shell config, but you need to re-run it after upgrading the CLI:

```bash
# zsh (a writable directory on your $fpath)
crowdin complete zsh > "${fpath[1]}/_crowdin"

# bash
crowdin complete bash > ~/.local/share/bash-completion/completions/crowdin

# fish
crowdin complete fish > ~/.config/fish/completions/crowdin.fish
```

## Further Reading

- [Commands](/commands/crowdin)
