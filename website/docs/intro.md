---
slug: /
---

# Introduction

Welcome to the official documentation site for Crowdin CLI - a fast, dependency-free command-line tool for managing your localization projects on Crowdin. Upload source files, download translations, and keep your localized content up-to-date with just a few simple commands.

Crowdin CLI is fast, portable, and easy to automate. It runs the same on your machine and in CI, and its scriptable output fits naturally into build pipelines and AI agent workflows.

With Crowdin CLI you can:

- Automate updating your source files in your Crowdin project
- Download translations from Crowdin and automatically save them in the correct locations
- Upload all your existing translations to Crowdin in minutes

Crowdin CLI is cross-platform: it runs in a terminal on Linux and macOS, or in Command Prompt on Windows.

[![Docker Pulls](https://img.shields.io/docker/pulls/crowdin/cli?logo=docker&cacheSeconds=2000)](https://hub.docker.com/r/crowdin/cli)
[![npm](https://img.shields.io/npm/dt/@crowdin/cli?logo=npm&cacheSeconds=2000)](https://www.npmjs.com/package/@crowdin/cli)
[![homebrew downloads](https://img.shields.io/homebrew/installs/dy/crowdin?logo=homebrew)](https://formulae.brew.sh/formula/crowdin)
[![Chocolatey](https://img.shields.io/chocolatey/dt/crowdin-cli?logo=chocolatey&cacheSeconds=2000)](https://community.chocolatey.org/packages/crowdin-cli)
[![GitHub all releases](https://img.shields.io/github/downloads/crowdin/crowdin-cli/total?label=assets%20downloads&logo=github&cacheSeconds=2000)](https://github.com/crowdin/crowdin-cli/releases)
[![codecov](https://codecov.io/gh/crowdin/crowdin-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/crowdin/crowdin-cli)

[![GitHub Used by](https://img.shields.io/static/v1?label=used%20by&message=3k&color=brightgreen&logo=github&cacheSeconds=10000)](https://github.com/crowdin/crowdin-cli/network/dependents)
[![GitHub contributors](https://img.shields.io/github/contributors/crowdin/crowdin-cli?cacheSeconds=1000)](https://github.com/crowdin/crowdin-cli/graphs/contributors)
![GitHub](https://img.shields.io/github/license/crowdin/crowdin-cli?cacheSeconds=50000)
[![GitHub Repo stars](https://img.shields.io/github/stars/crowdin/crowdin-cli?style=social&cacheSeconds=1800)](https://github.com/crowdin/crowdin-cli/stargazers)

<iframe width="100%" height="500px" src="https://www.youtube.com/embed/0duN4khpWjM" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen=""></iframe>

## Features

- Interactive generation of a configuration file
- Upload source files and existing translations to a Crowdin project
- Download the latest translations from Crowdin to the specified place
- Concurrent upload of source and translation files
- Show translation and proofreading progress for a project
- Manage source strings in a Crowdin project
- Manage glossaries and translation memories
- Manage tasks in a Crowdin project
- Manage source files and branches in the current project
- Machine-readable output for scripts and AI agent workflows
- Manage project context
- Run auto-translation via MT, TM, or AI
- Cached source uploads that skip files unchanged since the last run
- Polished interactive prompts - select menus, spinners, and graceful cancellation
- Bash/Zsh command completion
- HTTP Proxy support including authorization
- and more.

## Usage

Here is an overview of the basics of using the CLI. Use the following command to run the CLI:

```bash
crowdin some-command [CONFIG OPTIONS] [OPTIONS]
```

### Options

Here are the common options for all CLI commands:

| Option               | Description                                                       |
|----------------------|-------------------------------------------------------------------|
| `-h`, `--help`       | Show the help message and exit                                    |
| `--no-colors`        | Disable colors and styles                                         |
| `--no-progress`      | Disable progress on executed command                              |
| `-v`, `--verbose`    | Show more information on the command execution                    |
| `-V`, `--version`    | Print version information and exit                                |
| `--debug`            | Provide additional debugging information in case of errors        |
| `-o`, `--output`=*…* | Change the output format (choices: `json`, `toon`, `plain`)       |
| `-c`, `--config`=*…* | Specify a path to the configuration file (default: `crowdin.yml`) |
| `--identity`=*…*     | Specify a path to user-specific credentials                       |

### Config options

Crowdin CLI config options provide an alternative way to pass options that can be configured via the [configuration file](/configuration). When config options are specified as command parameters, CLI considers them to have higher priority than the options specified in the configuration file. The config options also allow the CLI to be used without a configuration file.

Here are the common config options for all CLI commands:

| Option                   | Description                                                                                                                                                             |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `-T`, `--token`=*…*      | Personal Access Token required for authentication                                                                                                                       |
| `--base-url`=*…*         | Base URL of Crowdin server for API requests execution (`https://api.crowdin.com` for crowdin.com, `https://{organization-name}.api.crowdin.com` for Crowdin Enterprise) |
| `--base-path`=*…*        | Path to your project directory on a local machine (default: `.`)                                                                                                        |
| `-i`, `--project-id`=*…* | Numerical ID of the Crowdin project                                                                                                                                     |

Some commands have their own config options.

## Further Reading

- [Installation](/installation)
- [Configuration](/configuration)
- [Autocompletion](/autocompletion)
- [Exit Codes](/exit-codes)
- [Commands](/commands/crowdin)
