# Crowdin CLI

Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project:

- Automate the process of updating your source files in your Crowdin project
- Download translations from Crowdin and automatically save them in the correct locations
- Upload all your existing translations in minutes
- Manage your localization resources without leaving the terminal
- Integrate localization into your CI/CD pipeline

The CLI ships as a native, self-contained binary for each platform - nothing else to install, instant startup, and equally at home in an interactive terminal or a CI job.

## Installation

```
npm i -g @crowdin/cli
```

npm automatically installs the binary matching your platform (macOS arm64/x64, Linux x64/arm64 glibc & musl, Windows x64). Other options - Homebrew, Chocolatey, Docker, standalone binaries - are covered in the [installation guide](https://crowdin.github.io/crowdin-cli/installation).

## Getting started

The interactive wizard authorizes the CLI in your browser and walks you to a ready `crowdin.yml` configuration:

```bash
crowdin init
```

Then sync your localization resources:

```bash
# upload source files to Crowdin
crowdin upload sources

# upload existing translations
crowdin upload translations

# download the latest translations
crowdin download
```

Add `--dry-run` to preview what a command would do, and `-h` to any command for its options.

## Scripting and automation

The global `-o, --output` option switches any command to machine-readable output: `json` (pipe it into `jq`), `toon` ([Token-Oriented Object Notation](https://github.com/toon-format/toon) - the same data in a compact form that suits LLM and agent workflows), or `plain`. Combined with stable exit codes, this makes the CLI easy to drive from scripts, CI pipelines, and AI agents.

## Shell completion

Crowdin CLI ships completions for `zsh`, `bash`, `fish`, and `powershell` - see the [autocompletion guide](https://crowdin.github.io/crowdin-cli/autocompletion) to enable them for your shell.

## Documentation

- [Crowdin CLI documentation](https://crowdin.github.io/crowdin-cli)
- [Configuration file reference](https://crowdin.github.io/crowdin-cli/configuration)
- [Report an issue](https://github.com/crowdin/crowdin-cli/issues)

## License

MIT
