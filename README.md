[<p align="center"><img src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" data-canonical-src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" width="150" height="150" align="center"/></p>](https://crowdin.com)

# Crowdin CLI [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fcrowdin%2Fcrowdin-cli&text=Crowdin%20CLI%20is%20an%20open-source%20command-line%20tool%20that%20allows%20you%20to%20manage%20and%20synchronize%20your%20localization%20resources%20with%20your%20Crowdin%20project)&nbsp;[![GitHub Repo stars](https://img.shields.io/github/stars/crowdin/crowdin-cli?style=social&cacheSeconds=1800)](https://github.com/crowdin/crowdin-cli/stargazers)

Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project. Using CLI, you can:

- automate the process of updating your source files in your Crowdin project
- download translations from Crowdin and automatically save them in the correct locations
- upload all your existing translations to Crowdin in minutes
- integrate Crowdin with GIT, SVN, Mercurial, and other software

This is a cross-platform and it runs in a terminal on Linux based and macOS operating systems or in Command Prompt on Windows.

<div align="center">

[**`Docs`**](https://developer.crowdin.com/cli-tool/) | 
[**`Configuration File`**](https://developer.crowdin.com/configuration-file/) | 
[**`Wiki`**](https://github.com/crowdin/crowdin-cli/wiki)

[![Build Status](https://dev.azure.com/crowdin/crowdin-cli-3/_apis/build/status/Build%20and%20Test?branchName=cli3)](https://dev.azure.com/crowdin/crowdin-cli-3/_build/latest?definitionId=22&branchName=cli3&cacheSeconds=1000)
[![Docker Pulls](https://img.shields.io/docker/pulls/crowdin/cli?logo=docker&cacheSeconds=2000)](https://hub.docker.com/r/crowdin/cli)
[![npm](https://img.shields.io/npm/dt/@crowdin/cli?logo=npm&cacheSeconds=2000)](https://www.npmjs.com/package/@crowdin/cli)
[![homebrew downloads](https://img.shields.io/homebrew/installs/dy/crowdin?logo=homebrew)](https://formulae.brew.sh/formula/crowdin)
[![GitHub contributors](https://img.shields.io/github/contributors/crowdin/crowdin-cli?cacheSeconds=1000)](https://github.com/crowdin/crowdin-cli/graphs/contributors)
![GitHub](https://img.shields.io/github/license/crowdin/crowdin-cli?cacheSeconds=50000)

![Azure DevOps tests (branch)](https://img.shields.io/azure-devops/tests/crowdin/crowdin-cli-3/22/cli3?cacheSeconds=2000)
[![codecov](https://codecov.io/gh/crowdin/crowdin-cli/branch/cli3/graph/badge.svg)](https://codecov.io/gh/crowdin/crowdin-cli)

 </div>
 
## Table of Contents

* [Features](#features)
* [Installation](#installation)
* [Running](#running)
* [Configuration](#configuration)
* [Usage](#usage)
  * [General Commands](#general-commands)
  * [Uploading Resources](#uploading-resources)
  * [Downloading Translations](#downloading-translations)
  * [Versions Management](#versions-management)
  * [Advanced Usage](#advanced-usage)
* [Seeking Assistance](#seeking-assistance)
* [Contributing](#contributing)
* [Contributors](#contributors-)
* [License](#license)

---

[<p align="center"><img src="https://raw.githubusercontent.com/crowdin/crowdin-cli/docs/cli.png" data-canonical-src="https://raw.githubusercontent.com/crowdin/crowdin-cli/docs/cli.png" width="100%" height="auto" align="center"/></p>](https://crowdin.com)

## Features

- Interactive generation of a configuration file
- Upload source files and existing translations to a Crowdin project
- Download latest translations from Crowdin to the specified place
- Show translation and proofreading progress for a project
- Manage source strings in a Crowdin project
- Manage glossaries and translation memories
- Show a list of source files and branches in the current project
- List information about the source files or translations that match the wild-card pattern contained in the current project
- Multithreading for source and translation files upload
- Bash/Zsh command completion
- Process indicators, loading states, emojis
- HTTP Proxy support including authorization
- To explore more features, visit the [Wiki](https://github.com/crowdin/crowdin-cli/wiki), [KB article](https://support.crowdin.com/cli-tool/) and [Configuration File article](https://support.crowdin.com/configuration-file/).

## Installation

### Requirements

Check if you have Java 8 or newer installed. Type `java -version` command in the terminal (Command Prompt on Windows) to check Java version.

For example, *java version "1.8.0_212"* means that you have Java 8 Update 212 installed.

<details>
<summary><b>Homebrew for macOS</b></summary>
To install the Crowdin CLI with homebrew (the package manager for macOS):

```console
brew tap crowdin/crowdin
```

```console
brew install crowdin@3
```

</details>

<details>
<summary><b>Windows</b></summary>

Download and run [installer for Windows](https://downloads.crowdin.com/cli/v3/crowdin.exe).

</details>

<details>
<summary><b>Debian</b></summary>

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```console
wget -qO - https://artifacts.crowdin.com/repo/GPG-KEY-crowdin | sudo apt-key add -
```

Using the following command, create the *crowdin.list* file in the */etc/apt/sources.list.d* directory:

```console
echo "deb https://artifacts.crowdin.com/repo/deb/ /" > /etc/apt/sources.list.d/crowdin.list
```

And your repository is ready for use. You can install the Crowdin CLI Debian package with:

```console
sudo apt-get update && sudo apt-get install crowdin3
```

To install the Crowdin CLI manually:

```console
wget https://artifacts.crowdin.com/repo/deb/crowdin3.deb -O crowdin.deb
```

```console
sudo dpkg -i crowdin.deb
```

</details>

<details>
<summary><b>RPM</b></summary>

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```console
rpm --import https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
```

Installing from the RPM repository

Create a file called *crowdin.repo* in the */etc/yum.repos.d* directory containing:

*/etc/yum.repos.d/crowdin.repo*:
```ini
[crowdin]
name=Crowdin repository
baseurl=https://artifacts.crowdin.com/repo/rpm
gpgcheck=1
gpgkey=https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
enabled=1
```

And your repository is ready for use. You can now install Crowdin CLI with one of the following commands:

```console
sudo yum install crowdin3
```

```console
sudo dnf install crowdin3
```

To install the Crowdin CLI manually:

```console
wget https://artifacts.crowdin.com/repo/rpm/crowdin3.rpm -O crowdin.rpm
```

```console
sudo rpm -U crowdin3.rpm
```

</details>

<details>
<summary><b>Arch Linux</b></summary>

Visit the Crowdin CLI [package page](https://aur.archlinux.org/packages/crowdin-cli/) on Arch Linux user repository.

</details>

<details>
<summary><b>NPM</b></summary>

```console
npm i -g @crowdin/cli
```

</details>

<details>
<summary><b>Docker</b></summary>

```console
docker pull crowdin/cli
```

</details>

<details>
<summary><b>Standalone Version</b></summary>

Crowdin CLI can be installed as a stand-alone Java application.

[Download for MacOS, Linux and Windows](https://downloads.crowdin.com/cli/v3/crowdin-cli.zip)

#### Installation on Linux and macOS

- Download crowdin-cli.zip using the button above
- Unpack it
- Run `./install-crowdin-cli.sh` in the terminal with sudo rights in order to add crowdin command to your terminal

#### Installation on Windows

- Download *crowdin-cli.zip* using the button above
- Extract it's content to the place where you want Crowdin CLI to be stored
- Open *Command Prompt* as an Administrator
  - Click *Start*
  - In the *Start Search box*, type `cmd`, and then press `CTRL`+`SHIFT`+`ENTER`
  - If the *User Account Control* dialog box appears, confirm that the action it displays is what you want, and then click *Continue*
- Run `setup-crowdin.bat` script in order to add crowdin command to the *Command Prompt*
- Restart your *Command Prompt*

</details>

## Running

Use the following method to run the app:

```console
crowdin
```

Alternative method:

```console
java -jar crowdin-cli.jar
```

## Configuration

Crowdin CLI uses a YAML configuration file that contains a description of the resources to manage: files to be uploaded into Crowdin and the locations of the corresponding translations.

To use Crowdin CLI, you should first generate your configuration file and then run the tool. By default, Crowdin CLI looks for a configuration file named *crowdin.yaml* or *crowdin.yml* (so you don’t have to specify the file name unless it’s different from *crowdin.yaml*).

To create the configuration file run the following command:

```console
crowdin init
```

When calling Crowdin CLI in terminal make sure you are in your project root directory. Otherwise, you need to specify a configuration file path using  `--config` option:

```console
crowdin upload sources --config /path/to/your/config/file
```

Sample configuration file:

```yaml
"project_id": "12"
"api_token": "54e01--your-personal-token--2724a"
"base_path": "."
"base_url": "https://api.crowdin.com" # https://{organization-name}.crowdin.com

"preserve_hierarchy": true

"files": [
  {
    "source" : "/resources/**/*",
    "translation" : "/%two_letters_code%/%original_file_name%"
  }
]
```

:memo: For more information how to configure Crowdin CLI, check <a href="https://support.crowdin.com/configuration-file/" target="_blank">Configuration File</a> article.

## Usage

Once the configuration file is created, you can use Crowdin CLI to manage your localization resources and automate file synchronization.

### General Commands

To display help information:

```console
crowdin -h
```

```console
crowdin <command> -h
```

To generate skeleton configuration file:

```console
crowdin init
```

To check configuration file for general mistakes:

```console
crowdin lint
```

To display a list of files uploaded to Crowdin:

```console
crowdin list project
```

### Uploading Resources

To upload source files to Crowdin:

```console
crowdin upload sources
```

To upload single file without a configuration:

```console
crowdin upload sources \
    -s path/to/your/file \
    -t file/export/pattern \
    -T personal-access-token \
    -i project-id \
    --base-url https://api.crowdin.com
```

Use <a href="https://support.crowdin.com/configuration-file/#placeholders" target="_blank">placeholders</a> to put appropriate variables.

To display a list of files that will be uploaded to Crowdin:

```console
crowdin upload sources --dryrun
```

To upload existing translations to Crowdin (translations will be synchronized):

```console
crowdin upload translations
```

To show detailed information about the `upload` command:

```console
crowdin upload --help
```

## Downloading Translations

To download the latest translations from Crowdin:

```console
crowdin download
```

To download the latest translations for the specific language (<a href="https://support.crowdin.com/api/language-codes/" target="_blank">language codes</a>):

```console
crowdin download -l {language_code}
```

To display a list of the latest translations from Crowdin:

```console
crowdin download --dryrun
```

To show detailed information about the `download` command:

```console
crowdin download --help
```

## Versions Management

There is no need to run specific command to create version branches if you use synchronization tool. The version branch is created automatically during the files upload.

To upload source files to the specified version branch:

```console
crowdin upload sources -b {branch_name}
```

To upload translations to the specified version branch:

```console
crowdin upload translations -b {branch_name}
```

To download translations from the specified version branch:

```console
crowdin download -b {branch_name}
```

## Advanced Usage

Visit the [Crowdin CLI Wiki](https://github.com/crowdin/crowdin-cli/wiki) to read more about CLI advanced features (like pseudo-localization, translations downloading to the specified file, etc.)

## Seeking Assistance

If you find any problems or would like to suggest a feature, please read the [How can I contribute](/CONTRIBUTING.md#how-can-i-contribute) section in our contributing guidelines.

Need help working with Crowdin CLI or have any questions? [Contact Customer Success Service](https://crowdin.com/contacts).

## Contributing

If you want to contribute please read the [Contributing](/CONTRIBUTING.md) guidelines.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/frombetelgeuse"><img src="https://avatars.githubusercontent.com/u/16529454?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Barabash</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=frombetelgeuse" title="Code">💻</a> <a href="https://github.com/crowdin/crowdin-cli/commits?author=frombetelgeuse" title="Tests">⚠️</a> <a href="https://github.com/crowdin/crowdin-cli/pulls?q=is%3Apr+reviewed-by%3Afrombetelgeuse" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://github.com/andrii-bodnar"><img src="https://avatars.githubusercontent.com/u/29282228?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Andrii Bodnar</b></sub></a><br /><a href="#maintenance-andrii-bodnar" title="Maintenance">🚧</a> <a href="#projectManagement-andrii-bodnar" title="Project Management">📆</a> <a href="#infra-andrii-bodnar" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/ihorpopyk"><img src="https://avatars.githubusercontent.com/u/15789944?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ihor Popyk</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=ihorpopyk" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/MrAndersonn"><img src="https://avatars.githubusercontent.com/u/5548419?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MrAndersonn</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=MrAndersonn" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/yevheniyJ"><img src="https://avatars.githubusercontent.com/u/16465671?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yevheniy Oliynyk</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=yevheniyJ" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/dmytro-protsyk"><img src="https://avatars.githubusercontent.com/u/16881205?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dmytro Protsyk</b></sub></a><br /><a href="#maintenance-dmytro-protsyk" title="Maintenance">🚧</a></td>
    <td align="center"><a href="https://github.com/hakanai"><img src="https://avatars.githubusercontent.com/u/43236?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Hakanai</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=hakanai" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/cmrd-senya"><img src="https://avatars.githubusercontent.com/u/10187586?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Senya</b></sub></a><br /><a href="#platform-cmrd-senya" title="Packaging/porting to new platform">📦</a></td>
    <td align="center"><a href="https://github.com/vasyl-khomko"><img src="https://avatars.githubusercontent.com/u/9516865?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Vasyl Khomko</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=vasyl-khomko" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/Myself5"><img src="https://avatars.githubusercontent.com/u/6061713?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Christian Oder</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=Myself5" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/rohalskyy"><img src="https://avatars.githubusercontent.com/u/20131160?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mykhailo Rohalskyy</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=rohalskyy" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/nazar-1"><img src="https://avatars.githubusercontent.com/u/52151259?v=4?s=100" width="100px;" alt=""/><br /><sub><b>nazar-1</b></sub></a><br /><a href="https://github.com/crowdin/crowdin-cli/commits?author=nazar-1" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License
<pre>
The Crowdin CLI is licensed under the MIT License. 
See the LICENSE.md file distributed with this work for additional 
information regarding copyright ownership.

Except as contained in the LICENSE file, the name(s) of the above copyright
holders shall not be used in advertising or otherwise to promote the sale,
use or other dealings in this Software without prior written authorization.
</pre>
